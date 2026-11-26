package si.plaan.service.impl;

import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.request.CompleteMaintenanceWorkOrderRequest;
import si.plaan.dto.request.CreateMaintenanceWorkOrderRequest;
import si.plaan.dto.request.StartMaintenanceWorkOrderRequest;
import si.plaan.dto.response.EquipmentMaintenanceHistoryItemResponse;
import si.plaan.dto.response.MaintenanceWorkOrderResponse;
import si.plaan.dto.response.MaintenanceWorkOrderSummaryResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.entity.*;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.EquipmentRepository;
import si.plaan.repository.MaintenancePlanRepository;
import si.plaan.repository.MaintenanceWorkOrderRepository;
import si.plaan.repository.OrganizationRepository;
import si.plaan.service.MaintenanceWorkOrderService;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class MaintenanceWorkOrderServiceImpl implements MaintenanceWorkOrderService {

    private static final String MWO_PREFIX = "MWO-";
    private static final Set<MaintenanceWorkOrderStatus> UNRESOLVED =
            EnumSet.of(MaintenanceWorkOrderStatus.OPEN, MaintenanceWorkOrderStatus.IN_PROGRESS);

    private final MaintenanceWorkOrderRepository workOrderRepository;
    private final MaintenancePlanRepository maintenancePlanRepository;
    private final EquipmentRepository equipmentRepository;
    private final OrganizationRepository organizationRepository;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<MaintenanceWorkOrderResponse> getWorkOrders(
            Long orgId,
            String search,
            MaintenanceWorkOrderStatus status,
            MaintenanceWorkOrderType type,
            Long equipmentId,
            Pageable pageable) {
        requireOrg(orgId);

        Specification<MaintenanceWorkOrder> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("organization").get("id"), orgId));
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (type != null) {
                predicates.add(cb.equal(root.get("maintenanceType"), type));
            }
            if (equipmentId != null) {
                predicates.add(cb.equal(root.get("equipment").get("id"), equipmentId));
            }
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("workOrderNumber")), pattern),
                        cb.like(cb.lower(root.get("activityName")), pattern),
                        cb.like(cb.lower(root.get("equipment").get("equipmentCode")), pattern),
                        cb.like(cb.lower(root.get("equipment").get("equipmentName")), pattern),
                        cb.like(cb.lower(root.get("assignedTo")), pattern)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<MaintenanceWorkOrder> page = workOrderRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(this::mapToResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public MaintenanceWorkOrderSummaryResponse getSummary(Long orgId) {
        requireOrg(orgId);
        return new MaintenanceWorkOrderSummaryResponse(
                workOrderRepository.countByOrganizationIdAndStatus(orgId, MaintenanceWorkOrderStatus.OPEN),
                workOrderRepository.countByOrganizationIdAndStatus(orgId, MaintenanceWorkOrderStatus.IN_PROGRESS),
                workOrderRepository.countByOrganizationIdAndStatus(orgId, MaintenanceWorkOrderStatus.COMPLETED),
                workOrderRepository.countByOrganizationIdAndStatus(orgId, MaintenanceWorkOrderStatus.CANCELLED)
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<EquipmentMaintenanceHistoryItemResponse> getHistoryByEquipment(Long orgId, Long equipmentId) {
        requireOrg(orgId);
        requireEquipment(orgId, equipmentId);
        return workOrderRepository
                .findByOrganizationIdAndEquipmentIdAndStatusOrderByActualEndAtDesc(
                        orgId, equipmentId, MaintenanceWorkOrderStatus.COMPLETED)
                .stream()
                .map(wo -> new EquipmentMaintenanceHistoryItemResponse(
                        wo.getId(),
                        wo.getWorkOrderNumber(),
                        wo.getActualEndAt() != null ? wo.getActualEndAt().toLocalDate() : wo.getWorkOrderDate(),
                        wo.getActivityName(),
                        wo.getMaintenanceType(),
                        wo.getDurationMinutes()
                ))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public MaintenanceWorkOrderResponse getById(Long orgId, Long id) {
        requireOrg(orgId);
        return mapToResponse(requireWorkOrder(orgId, id));
    }

    @Override
    @Transactional(readOnly = true)
    public String getNextWorkOrderNumber(Long orgId) {
        requireOrg(orgId);
        int max = workOrderRepository.findMaxWorkOrderNumberByOrganizationId(orgId);
        return String.format("%s%03d", MWO_PREFIX, max + 1);
    }

    @Override
    @Transactional
    public MaintenanceWorkOrderResponse create(Long orgId, CreateMaintenanceWorkOrderRequest request) {
        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with id: " + orgId));

        if (request.maintenanceType() == null) {
            throw new IllegalArgumentException("Maintenance type is required");
        }

        Equipment equipment = requireActiveEquipment(orgId, request.equipmentId());
        MaintenancePlan plan = null;
        String activityName;
        String instructions = null;
        String problemDescription = trimToNull(request.problemDescription());

        if (request.maintenanceType() == MaintenanceWorkOrderType.PREVENTIVE) {
            if (request.maintenancePlanId() == null) {
                throw new IllegalArgumentException("Maintenance plan is required for preventive work orders");
            }
            plan = requirePlan(orgId, request.maintenancePlanId());
            if (plan.getStatus() != MaintenancePlanStatus.ACTIVE) {
                throw new IllegalArgumentException("Inactive maintenance plans cannot generate work orders");
            }
            if (!plan.getEquipment().getId().equals(equipment.getId())) {
                throw new IllegalArgumentException("Selected equipment does not match the maintenance plan");
            }
            if (workOrderRepository.existsByOrganizationIdAndMaintenancePlanIdAndStatusIn(
                    orgId, plan.getId(), UNRESOLVED)) {
                throw new IllegalStateException(
                        "An open or in-progress work order already exists for this maintenance plan");
            }
            activityName = plan.getPlanName();
            instructions = plan.getInstructions();
            if (problemDescription == null) {
                problemDescription = plan.getPlanName();
            }
        } else {
            if (problemDescription == null) {
                throw new IllegalArgumentException("Problem description is required for breakdown work orders");
            }
            if (request.breakdownDate() == null || request.breakdownTime() == null) {
                throw new IllegalArgumentException("Breakdown date and time are required");
            }
            activityName = problemDescription.length() > 200
                    ? problemDescription.substring(0, 197) + "..."
                    : problemDescription;
        }

        LocalDate workOrderDate = request.workOrderDate() != null ? request.workOrderDate() : LocalDate.now();

        MaintenanceWorkOrder rootBreakdown = null;
        LocalDate breakdownDate = null;
        LocalTime breakdownTime = null;
        if (request.maintenanceType() == MaintenanceWorkOrderType.BREAKDOWN) {
            rootBreakdown = findActiveBreakdownRoot(orgId, equipment.getId());
            if (rootBreakdown != null) {
                breakdownDate = rootBreakdown.getBreakdownDate();
                breakdownTime = rootBreakdown.getBreakdownTime();
            } else {
                breakdownDate = request.breakdownDate();
                breakdownTime = request.breakdownTime();
            }
        }

        MaintenanceWorkOrder wo = MaintenanceWorkOrder.builder()
                .organization(org)
                .workOrderNumber(resolveNumber(orgId, request.workOrderNumber()))
                .workOrderDate(workOrderDate)
                .maintenanceType(request.maintenanceType())
                .status(MaintenanceWorkOrderStatus.OPEN)
                .priority(request.priority() != null ? request.priority() : MaintenanceWorkOrderPriority.MEDIUM)
                .equipment(equipment)
                .maintenancePlan(plan)
                .activityName(activityName)
                .assignedTo(trimToNull(request.assignedTo()))
                .problemDescription(problemDescription)
                .instructions(instructions)
                .notes(trimToNull(request.notes()))
                .breakdownDate(breakdownDate)
                .breakdownTime(breakdownTime)
                .rootBreakdownWorkOrder(rootBreakdown)
                .build();

        if (request.maintenanceType() == MaintenanceWorkOrderType.BREAKDOWN) {
            equipment.setOperationalStatus(EquipmentOperationalStatus.BREAKDOWN);
            equipmentRepository.save(equipment);
        }

        MaintenanceWorkOrder saved = workOrderRepository.save(wo);
        log.info("Created maintenance work order {} ({}) for equipment {} org {}",
                saved.getWorkOrderNumber(), saved.getMaintenanceType(), equipment.getEquipmentCode(), orgId);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public MaintenanceWorkOrderResponse start(Long orgId, Long id, StartMaintenanceWorkOrderRequest request) {
        requireOrg(orgId);
        MaintenanceWorkOrder wo = requireWorkOrder(orgId, id);
        if (wo.getStatus() != MaintenanceWorkOrderStatus.OPEN) {
            throw new IllegalStateException("Only open work orders can be started");
        }

        Long equipmentId = wo.getEquipment().getId();
        if (workOrderRepository.existsByOrganizationIdAndEquipmentIdAndStatusIn(
                orgId, equipmentId, EnumSet.of(MaintenanceWorkOrderStatus.IN_PROGRESS))) {
            throw new IllegalStateException(
                    "Another in-progress work order already exists for this equipment");
        }

        LocalDateTime startAt = resolveTimestamp(
                request != null ? request.startDate() : null,
                request != null ? request.startTime() : null,
                LocalDateTime.now());

        wo.setActualStartAt(startAt);
        wo.setStatus(MaintenanceWorkOrderStatus.IN_PROGRESS);

        Equipment equipment = wo.getEquipment();
        equipment.setOperationalStatus(EquipmentOperationalStatus.UNDER_MAINTENANCE);
        equipmentRepository.save(equipment);

        MaintenanceWorkOrder saved = workOrderRepository.save(wo);
        log.info("Started maintenance work order {} for org {}", saved.getWorkOrderNumber(), orgId);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public MaintenanceWorkOrderResponse complete(Long orgId, Long id, CompleteMaintenanceWorkOrderRequest request) {
        requireOrg(orgId);
        MaintenanceWorkOrder wo = requireWorkOrder(orgId, id);
        if (wo.getStatus() != MaintenanceWorkOrderStatus.IN_PROGRESS) {
            throw new IllegalStateException("Only in-progress work orders can be completed");
        }
        if (wo.getActualStartAt() == null) {
            throw new IllegalStateException("Work order has no start timestamp");
        }

        String workPerformed = requireText(request.workPerformed(), "Work performed is required");
        if (request.completionDate() == null || request.completionTime() == null) {
            throw new IllegalArgumentException("Completion date and time are required");
        }
        if (request.machineOperational() == null) {
            throw new IllegalArgumentException("Machine operational confirmation is required");
        }

        LocalDateTime endAt = LocalDateTime.of(request.completionDate(), request.completionTime());
        if (endAt.isBefore(wo.getActualStartAt())) {
            throw new IllegalArgumentException("Completion time cannot be before start time");
        }

        wo.setWorkPerformed(workPerformed);
        wo.setActualEndAt(endAt);
        wo.setCompletionRemarks(trimToNull(request.remarks()));
        wo.setMachineOperational(request.machineOperational());
        wo.setDurationMinutes((int) Duration.between(wo.getActualStartAt(), endAt).toMinutes());
        wo.setStatus(MaintenanceWorkOrderStatus.COMPLETED);

        if (wo.getMaintenanceType() == MaintenanceWorkOrderType.BREAKDOWN
                && Boolean.TRUE.equals(request.machineOperational())) {
            MaintenanceWorkOrder root = resolveBreakdownRoot(wo);
            if (root.getBreakdownDate() != null && root.getBreakdownTime() != null) {
                LocalDateTime breakdownAt = LocalDateTime.of(root.getBreakdownDate(), root.getBreakdownTime());
                if (!endAt.isBefore(breakdownAt)) {
                    wo.setDowntimeMinutes((int) Duration.between(breakdownAt, endAt).toMinutes());
                }
            }
        }

        Equipment equipment = wo.getEquipment();
        if (Boolean.TRUE.equals(request.machineOperational())) {
            if (!hasOtherUnresolved(orgId, equipment.getId(), wo.getId())) {
                equipment.setOperationalStatus(EquipmentOperationalStatus.OPERATIONAL);
            }
            // else leave status as-is (still under maintenance / breakdown from other WO)
        } else {
            equipment.setOperationalStatus(EquipmentOperationalStatus.BREAKDOWN);
        }
        equipmentRepository.save(equipment);

        // Advance preventive plan only on successful completion
        if (wo.getMaintenanceType() == MaintenanceWorkOrderType.PREVENTIVE
                && Boolean.TRUE.equals(request.machineOperational())
                && wo.getMaintenancePlan() != null) {
            MaintenancePlan plan = wo.getMaintenancePlan();
            LocalDate completionDate = request.completionDate();
            plan.setLastCompletedDate(completionDate);
            plan.setNextDueDate(completionDate.plusDays(plan.getFrequencyDays()));
            maintenancePlanRepository.save(plan);
        }

        MaintenanceWorkOrder saved = workOrderRepository.save(wo);
        log.info("Completed maintenance work order {} for org {}", saved.getWorkOrderNumber(), orgId);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public MaintenanceWorkOrderResponse cancel(Long orgId, Long id) {
        requireOrg(orgId);
        MaintenanceWorkOrder wo = requireWorkOrder(orgId, id);
        if (wo.getStatus() != MaintenanceWorkOrderStatus.OPEN) {
            throw new IllegalStateException("Only open work orders can be cancelled");
        }

        wo.setStatus(MaintenanceWorkOrderStatus.CANCELLED);
        MaintenanceWorkOrder saved = workOrderRepository.save(wo);

        // Breakdown create flipped equipment to BREAKDOWN; restore if nothing else blocks it
        if (wo.getMaintenanceType() == MaintenanceWorkOrderType.BREAKDOWN) {
            Equipment equipment = wo.getEquipment();
            if (equipment.getOperationalStatus() == EquipmentOperationalStatus.BREAKDOWN
                    && !hasOtherUnresolved(orgId, equipment.getId(), wo.getId())) {
                equipment.setOperationalStatus(EquipmentOperationalStatus.OPERATIONAL);
                equipmentRepository.save(equipment);
            }
        }
        log.info("Cancelled maintenance work order {} for org {}", saved.getWorkOrderNumber(), orgId);
        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean hasUnresolvedWorkOrders(Long orgId, Long equipmentId) {
        requireOrg(orgId);
        return workOrderRepository.existsByOrganizationIdAndEquipmentIdAndStatusIn(
                orgId, equipmentId, UNRESOLVED);
    }

    private boolean hasOtherUnresolved(Long orgId, Long equipmentId, Long excludeWorkOrderId) {
        return workOrderRepository.findAll((root, query, cb) -> cb.and(
                cb.equal(root.get("organization").get("id"), orgId),
                cb.equal(root.get("equipment").get("id"), equipmentId),
                root.get("status").in(UNRESOLVED),
                cb.notEqual(root.get("id"), excludeWorkOrderId)
        )).stream().findAny().isPresent();
    }

    private Equipment requireActiveEquipment(Long orgId, Long equipmentId) {
        Equipment equipment = requireEquipment(orgId, equipmentId);
        if (equipment.getRecordStatus() != EquipmentRecordStatus.ACTIVE) {
            throw new IllegalArgumentException("Only active equipment can be selected for a work order");
        }
        return equipment;
    }

    private Equipment requireEquipment(Long orgId, Long equipmentId) {
        return equipmentRepository.findByIdAndOrganizationId(equipmentId, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Equipment not found with id: " + equipmentId));
    }

    private MaintenancePlan requirePlan(Long orgId, Long planId) {
        return maintenancePlanRepository.findByIdAndOrganizationId(planId, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Maintenance plan not found with id: " + planId));
    }

    private MaintenanceWorkOrder requireWorkOrder(Long orgId, Long id) {
        return workOrderRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Maintenance work order not found with id: " + id));
    }

    private String resolveNumber(Long orgId, String requested) {
        if (requested == null || requested.isBlank()) {
            return getNextWorkOrderNumber(orgId);
        }
        String code = requested.trim().toUpperCase(Locale.ROOT);
        if (workOrderRepository.existsByOrganizationIdAndWorkOrderNumberIgnoreCase(orgId, code)) {
            throw new IllegalArgumentException("Work order number '" + code + "' already exists in this organization");
        }
        return code;
    }

    private LocalDateTime resolveTimestamp(LocalDate date, LocalTime time, LocalDateTime fallback) {
        if (date == null && time == null) return fallback;
        if (date == null || time == null) {
            throw new IllegalArgumentException("Both start date and time are required when overriding start");
        }
        return LocalDateTime.of(date, time);
    }

    private String requireText(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(message);
        }
        return value.trim();
    }

    private MaintenanceWorkOrderResponse mapToResponse(MaintenanceWorkOrder wo) {
        MaintenancePlan plan = wo.getMaintenancePlan();
        return new MaintenanceWorkOrderResponse(
                wo.getId(),
                wo.getWorkOrderNumber(),
                wo.getWorkOrderDate(),
                wo.getMaintenanceType(),
                wo.getStatus(),
                wo.getPriority(),
                wo.getEquipment().getId(),
                wo.getEquipment().getEquipmentCode(),
                wo.getEquipment().getEquipmentName(),
                plan != null ? plan.getId() : null,
                plan != null ? plan.getPlanNumber() : null,
                plan != null ? plan.getPlanName() : null,
                wo.getActivityName(),
                wo.getAssignedTo(),
                wo.getProblemDescription(),
                wo.getInstructions(),
                wo.getNotes(),
                wo.getBreakdownDate(),
                wo.getBreakdownTime(),
                wo.getRootBreakdownWorkOrder() != null ? wo.getRootBreakdownWorkOrder().getId() : null,
                wo.getActualStartAt(),
                wo.getActualEndAt(),
                wo.getWorkPerformed(),
                wo.getCompletionRemarks(),
                wo.getMachineOperational(),
                wo.getDurationMinutes(),
                wo.getDowntimeMinutes(),
                wo.getCreatedAt(),
                wo.getUpdatedAt()
        );
    }

    private MaintenanceWorkOrder findActiveBreakdownRoot(Long orgId, Long equipmentId) {
        List<MaintenanceWorkOrder> unresolved = workOrderRepository
                .findByOrganizationIdAndEquipmentIdAndMaintenanceTypeAndStatusIn(
                        orgId,
                        equipmentId,
                        MaintenanceWorkOrderType.BREAKDOWN,
                        UNRESOLVED);
        if (!unresolved.isEmpty()) {
            return unresolved.stream()
                    .min(Comparator.comparing(this::breakdownAtOrMax))
                    .map(this::resolveBreakdownRoot)
                    .orElse(null);
        }

        List<MaintenanceWorkOrder> completed = workOrderRepository
                .findByOrganizationIdAndEquipmentIdAndMaintenanceTypeAndStatus(
                        orgId,
                        equipmentId,
                        MaintenanceWorkOrderType.BREAKDOWN,
                        MaintenanceWorkOrderStatus.COMPLETED);

        Map<Long, List<MaintenanceWorkOrder>> byRoot = new HashMap<>();
        for (MaintenanceWorkOrder wo : completed) {
            MaintenanceWorkOrder root = resolveBreakdownRoot(wo);
            byRoot.computeIfAbsent(root.getId(), key -> new ArrayList<>()).add(wo);
        }

        MaintenanceWorkOrder bestRoot = null;
        LocalDateTime bestBreakdown = null;
        for (Map.Entry<Long, List<MaintenanceWorkOrder>> entry : byRoot.entrySet()) {
            boolean restored = entry.getValue().stream()
                    .anyMatch(wo -> Boolean.TRUE.equals(wo.getMachineOperational()));
            if (restored) continue;
            MaintenanceWorkOrder root = resolveBreakdownRoot(entry.getValue().get(0));
            LocalDateTime breakdownAt = breakdownAtOrMax(root);
            if (bestRoot == null || breakdownAt.isBefore(bestBreakdown)) {
                bestRoot = root;
                bestBreakdown = breakdownAt;
            }
        }
        return bestRoot;
    }

    private MaintenanceWorkOrder resolveBreakdownRoot(MaintenanceWorkOrder wo) {
        return wo.getRootBreakdownWorkOrder() != null ? wo.getRootBreakdownWorkOrder() : wo;
    }

    private LocalDateTime breakdownAtOrMax(MaintenanceWorkOrder wo) {
        if (wo.getBreakdownDate() == null || wo.getBreakdownTime() == null) {
            return LocalDateTime.MAX;
        }
        return LocalDateTime.of(wo.getBreakdownDate(), wo.getBreakdownTime());
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void requireOrg(Long orgId) {
        if (orgId == null) throw new AccessDeniedException("Organization context required");
    }
}
