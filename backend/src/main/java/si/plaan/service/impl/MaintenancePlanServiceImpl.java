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
import si.plaan.dto.request.CreateMaintenancePlanRequest;
import si.plaan.dto.request.UpdateMaintenancePlanRequest;
import si.plaan.dto.response.MaintenancePlanResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.entity.*;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.EquipmentRepository;
import si.plaan.repository.MaintenancePlanRepository;
import si.plaan.repository.OrganizationRepository;
import si.plaan.service.MaintenancePlanService;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Slf4j
@Service
@RequiredArgsConstructor
public class MaintenancePlanServiceImpl implements MaintenancePlanService {

    private static final String MP_PREFIX = "MP-";

    private final MaintenancePlanRepository maintenancePlanRepository;
    private final EquipmentRepository equipmentRepository;
    private final OrganizationRepository organizationRepository;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<MaintenancePlanResponse> getPlans(
            Long orgId,
            String search,
            MaintenancePlanStatus status,
            MaintenanceScheduleStatus scheduleStatus,
            Long equipmentId,
            Pageable pageable) {
        requireOrg(orgId);
        LocalDate today = LocalDate.now();

        Specification<MaintenancePlan> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("organization").get("id"), orgId));
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (equipmentId != null) {
                predicates.add(cb.equal(root.get("equipment").get("id"), equipmentId));
            }
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("planNumber")), pattern),
                        cb.like(cb.lower(root.get("planName")), pattern),
                        cb.like(cb.lower(root.get("equipment").get("equipmentCode")), pattern),
                        cb.like(cb.lower(root.get("equipment").get("equipmentName")), pattern)
                ));
            }
            if (scheduleStatus != null) {
                predicates.add(switch (scheduleStatus) {
                    case DUE_TODAY -> cb.equal(root.get("nextDueDate"), today);
                    case OVERDUE -> cb.lessThan(root.get("nextDueDate"), today);
                    case UPCOMING -> cb.greaterThan(root.get("nextDueDate"), today);
                });
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<MaintenancePlan> page = maintenancePlanRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(p -> mapToResponse(p, today)));
    }

    @Override
    @Transactional(readOnly = true)
    public List<MaintenancePlanResponse> getPlansByEquipment(Long orgId, Long equipmentId) {
        requireOrg(orgId);
        requireEquipment(orgId, equipmentId); // ensures tenant isolation
        LocalDate today = LocalDate.now();
        return maintenancePlanRepository
                .findByOrganizationIdAndEquipmentIdOrderByNextDueDateAsc(orgId, equipmentId)
                .stream()
                .map(p -> mapToResponse(p, today))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public MaintenancePlanResponse getById(Long orgId, Long id) {
        requireOrg(orgId);
        return mapToResponse(requirePlan(orgId, id), LocalDate.now());
    }

    @Override
    @Transactional(readOnly = true)
    public String getNextPlanNumber(Long orgId) {
        requireOrg(orgId);
        int max = maintenancePlanRepository.findMaxPlanNumberByOrganizationId(orgId);
        return String.format("%s%03d", MP_PREFIX, max + 1);
    }

    @Override
    @Transactional
    public MaintenancePlanResponse create(Long orgId, CreateMaintenancePlanRequest request) {
        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with id: " + orgId));

        Equipment equipment = requireActiveEquipment(orgId, request.equipmentId());
        int frequency = requirePositiveFrequency(request.frequencyDays());
        String name = requireText(request.planName(), "Plan name is required");
        String instructions = requireText(request.instructions(), "Maintenance instructions are required");
        if (request.firstDueDate() == null) {
            throw new IllegalArgumentException("First due date is required");
        }

        MaintenancePlan plan = MaintenancePlan.builder()
                .organization(org)
                .planNumber(resolvePlanNumber(orgId, request.planNumber()))
                .planName(name)
                .equipment(equipment)
                .frequencyDays(frequency)
                .firstDueDate(request.firstDueDate())
                .nextDueDate(request.firstDueDate())
                .instructions(instructions)
                .notes(trimToNull(request.notes()))
                .status(request.status() != null ? request.status() : MaintenancePlanStatus.ACTIVE)
                .build();

        MaintenancePlan saved = maintenancePlanRepository.save(plan);
        log.info("Created maintenance plan {} for equipment {} org {}",
                saved.getPlanNumber(), equipment.getEquipmentCode(), orgId);
        return mapToResponse(saved, LocalDate.now());
    }

    @Override
    @Transactional
    public MaintenancePlanResponse update(Long orgId, Long id, UpdateMaintenancePlanRequest request) {
        requireOrg(orgId);
        MaintenancePlan plan = requirePlan(orgId, id);
        Equipment equipment = requireEquipment(orgId, request.equipmentId());

        boolean changingEquipment = !equipment.getId().equals(plan.getEquipment().getId());
        if (changingEquipment && equipment.getRecordStatus() != EquipmentRecordStatus.ACTIVE) {
            throw new IllegalArgumentException("Only active equipment can be selected for a maintenance plan");
        }

        int frequency = requirePositiveFrequency(request.frequencyDays());
        plan.setPlanName(requireText(request.planName(), "Plan name is required"));
        plan.setEquipment(equipment);
        plan.setFrequencyDays(frequency);
        plan.setFirstDueDate(request.firstDueDate());
        plan.setInstructions(requireText(request.instructions(), "Maintenance instructions are required"));
        plan.setNotes(trimToNull(request.notes()));
        plan.setStatus(request.status());

        // When never completed, next due tracks first due (completion via work orders advances it)
        if (plan.getLastCompletedDate() == null) {
            plan.setNextDueDate(request.firstDueDate());
        }

        MaintenancePlan saved = maintenancePlanRepository.save(plan);
        log.info("Updated maintenance plan {} for org {}", saved.getPlanNumber(), orgId);
        return mapToResponse(saved, LocalDate.now());
    }

    @Override
    @Transactional
    public MaintenancePlanResponse activate(Long orgId, Long id) {
        requireOrg(orgId);
        MaintenancePlan plan = requirePlan(orgId, id);
        if (plan.getStatus() == MaintenancePlanStatus.ACTIVE) {
            return mapToResponse(plan, LocalDate.now());
        }
        if (plan.getEquipment().getRecordStatus() != EquipmentRecordStatus.ACTIVE) {
            throw new IllegalStateException("Cannot activate a plan whose equipment is inactive");
        }
        plan.setStatus(MaintenancePlanStatus.ACTIVE);
        return mapToResponse(maintenancePlanRepository.save(plan), LocalDate.now());
    }

    @Override
    @Transactional
    public MaintenancePlanResponse deactivate(Long orgId, Long id) {
        requireOrg(orgId);
        MaintenancePlan plan = requirePlan(orgId, id);
        if (plan.getStatus() == MaintenancePlanStatus.INACTIVE) {
            return mapToResponse(plan, LocalDate.now());
        }
        plan.setStatus(MaintenancePlanStatus.INACTIVE);
        return mapToResponse(maintenancePlanRepository.save(plan), LocalDate.now());
    }

    private Equipment requireActiveEquipment(Long orgId, Long equipmentId) {
        Equipment equipment = requireEquipment(orgId, equipmentId);
        if (equipment.getRecordStatus() != EquipmentRecordStatus.ACTIVE) {
            throw new IllegalArgumentException("Only active equipment can be selected for a maintenance plan");
        }
        return equipment;
    }

    private Equipment requireEquipment(Long orgId, Long equipmentId) {
        return equipmentRepository.findByIdAndOrganizationId(equipmentId, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Equipment not found with id: " + equipmentId));
    }

    private String resolvePlanNumber(Long orgId, String requested) {
        if (requested == null || requested.isBlank()) {
            return getNextPlanNumber(orgId);
        }
        String code = requested.trim().toUpperCase(Locale.ROOT);
        if (maintenancePlanRepository.existsByOrganizationIdAndPlanNumberIgnoreCase(orgId, code)) {
            throw new IllegalArgumentException("Plan number '" + code + "' already exists in this organization");
        }
        return code;
    }

    private int requirePositiveFrequency(Integer frequencyDays) {
        if (frequencyDays == null || frequencyDays <= 0) {
            throw new IllegalArgumentException("Frequency must be greater than zero");
        }
        return frequencyDays;
    }

    private String requireText(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(message);
        }
        return value.trim();
    }

    private MaintenancePlan requirePlan(Long orgId, Long id) {
        return maintenancePlanRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Maintenance plan not found with id: " + id));
    }

    private MaintenancePlanResponse mapToResponse(MaintenancePlan p, LocalDate today) {
        return new MaintenancePlanResponse(
                p.getId(),
                p.getPlanNumber(),
                p.getPlanName(),
                p.getEquipment().getId(),
                p.getEquipment().getEquipmentCode(),
                p.getEquipment().getEquipmentName(),
                p.getFrequencyDays(),
                p.getFirstDueDate(),
                p.getNextDueDate(),
                p.getLastCompletedDate(),
                p.getInstructions(),
                p.getNotes(),
                p.getStatus(),
                resolveScheduleStatus(p.getNextDueDate(), today),
                p.getCreatedAt(),
                p.getUpdatedAt()
        );
    }

    public static MaintenanceScheduleStatus resolveScheduleStatus(LocalDate nextDueDate, LocalDate today) {
        if (nextDueDate.isEqual(today)) return MaintenanceScheduleStatus.DUE_TODAY;
        if (nextDueDate.isBefore(today)) return MaintenanceScheduleStatus.OVERDUE;
        return MaintenanceScheduleStatus.UPCOMING;
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
