package si.plaan.service.impl;

import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.response.MaintenanceHistoryEquipmentBreakdownResponse;
import si.plaan.dto.response.MaintenanceHistoryReportResponse;
import si.plaan.dto.response.MaintenanceHistoryRowResponse;
import si.plaan.dto.response.MaintenanceHistoryTotalsResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.entity.MaintenanceWorkOrder;
import si.plaan.entity.MaintenanceWorkOrderStatus;
import si.plaan.entity.MaintenanceWorkOrderType;
import si.plaan.entity.Organization;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.MaintenanceWorkOrderRepository;
import si.plaan.repository.OrganizationRepository;
import si.plaan.service.MaintenanceHistoryReportService;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.TreeSet;

@Service
@RequiredArgsConstructor
public class MaintenanceHistoryReportServiceImpl implements MaintenanceHistoryReportService {

    private final MaintenanceWorkOrderRepository workOrderRepository;
    private final OrganizationRepository organizationRepository;

    @Override
    @Transactional(readOnly = true)
    public MaintenanceHistoryReportResponse getReport(
            Long orgId,
            LocalDate fromDate,
            LocalDate toDate,
            Long equipmentId,
            MaintenanceWorkOrderType maintenanceType,
            String technician,
            Boolean machineOperational,
            Pageable pageable) {
        Organization org = requireOrg(orgId);
        DateRange range = normalizeRange(org, fromDate, toDate);

        List<MaintenanceWorkOrder> scoped = workOrderRepository.findAll(
                buildSpec(orgId, range.from(), range.to(), equipmentId, maintenanceType, null, machineOperational),
                Sort.by(Sort.Direction.DESC, "actualEndAt", "id"));

        List<String> technicians = scoped.stream()
                .map(MaintenanceWorkOrder::getAssignedTo)
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(() -> new TreeSet<>(String.CASE_INSENSITIVE_ORDER), TreeSet::add, TreeSet::addAll)
                .stream()
                .toList();

        List<MaintenanceWorkOrder> filtered = applyTechnicianFilter(scoped, technician);
        MaintenanceHistoryTotalsResponse summary = computeSummary(filtered);
        List<MaintenanceHistoryEquipmentBreakdownResponse> byEquipment =
                computeEquipmentBreakdown(filtered);

        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), filtered.size());
        List<MaintenanceHistoryRowResponse> pageContent = start >= filtered.size()
                ? List.of()
                : filtered.subList(start, end).stream().map(this::mapRow).toList();

        return new MaintenanceHistoryReportResponse(
                org.getBaseCurrency() != null ? org.getBaseCurrency() : "INR",
                range.from(),
                range.to(),
                summary,
                byEquipment,
                technicians,
                PageResponse.from(new PageImpl<>(pageContent, pageable, filtered.size()))
        );
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportCsv(
            Long orgId,
            LocalDate fromDate,
            LocalDate toDate,
            Long equipmentId,
            MaintenanceWorkOrderType maintenanceType,
            String technician,
            Boolean machineOperational) {
        Organization org = requireOrg(orgId);
        DateRange range = normalizeRange(org, fromDate, toDate);
        List<MaintenanceWorkOrder> rows = applyTechnicianFilter(
                workOrderRepository.findAll(
                        buildSpec(orgId, range.from(), range.to(), equipmentId, maintenanceType, null, machineOperational),
                        Sort.by(Sort.Direction.DESC, "actualEndAt", "id")),
                technician);

        StringBuilder csv = new StringBuilder();
        csv.append("Work Order Number,Equipment Code,Equipment Name,Maintenance Type,Maintenance Plan,")
                .append("Priority,Technician,Start Date & Time,Completion Date & Time,Maintenance Duration (minutes),")
                .append("Work Performed,Operational After Maintenance,Remarks\n");
        for (MaintenanceWorkOrder wo : rows) {
            csv.append(csvCell(wo.getWorkOrderNumber())).append(',')
                    .append(csvCell(wo.getEquipment().getEquipmentCode())).append(',')
                    .append(csvCell(wo.getEquipment().getEquipmentName())).append(',')
                    .append(wo.getMaintenanceType().name()).append(',')
                    .append(csvCell(wo.getMaintenancePlan() != null ? wo.getMaintenancePlan().getPlanName() : "")).append(',')
                    .append(wo.getPriority().name()).append(',')
                    .append(csvCell(wo.getAssignedTo())).append(',')
                    .append(wo.getActualStartAt() != null ? wo.getActualStartAt() : "").append(',')
                    .append(wo.getActualEndAt() != null ? wo.getActualEndAt() : "").append(',')
                    .append(wo.getDurationMinutes() != null ? wo.getDurationMinutes() : "").append(',')
                    .append(csvCell(wo.getWorkPerformed())).append(',')
                    .append(formatOperational(wo.getMachineOperational())).append(',')
                    .append(csvCell(wo.getCompletionRemarks()))
                    .append('\n');
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private Specification<MaintenanceWorkOrder> buildSpec(
            Long orgId,
            LocalDate from,
            LocalDate to,
            Long equipmentId,
            MaintenanceWorkOrderType maintenanceType,
            String technician,
            Boolean machineOperational) {
        LocalDateTime fromDateTime = from.atStartOfDay();
        LocalDateTime toDateTime = to.atTime(LocalTime.MAX);
        return (root, query, cb) -> {
            if (MaintenanceWorkOrder.class.equals(query.getResultType())) {
                root.fetch("equipment", JoinType.LEFT);
                root.fetch("maintenancePlan", JoinType.LEFT);
            }
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("organization").get("id"), orgId));
            predicates.add(cb.equal(root.get("status"), MaintenanceWorkOrderStatus.COMPLETED));
            predicates.add(cb.isNotNull(root.get("actualEndAt")));
            predicates.add(cb.greaterThanOrEqualTo(root.get("actualEndAt"), fromDateTime));
            predicates.add(cb.lessThanOrEqualTo(root.get("actualEndAt"), toDateTime));

            if (equipmentId != null) {
                predicates.add(cb.equal(root.get("equipment").get("id"), equipmentId));
            }
            if (maintenanceType != null) {
                predicates.add(cb.equal(root.get("maintenanceType"), maintenanceType));
            }
            if (machineOperational != null) {
                predicates.add(cb.equal(root.get("machineOperational"), machineOperational));
            }
            if (technician != null && !technician.isBlank()) {
                predicates.add(cb.equal(cb.lower(root.get("assignedTo")),
                        technician.trim().toLowerCase(Locale.ROOT)));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private List<MaintenanceWorkOrder> applyTechnicianFilter(
            List<MaintenanceWorkOrder> rows, String technician) {
        if (technician == null || technician.isBlank()) return rows;
        String needle = technician.trim().toLowerCase(Locale.ROOT);
        return rows.stream()
                .filter(wo -> wo.getAssignedTo() != null
                        && wo.getAssignedTo().trim().toLowerCase(Locale.ROOT).equals(needle))
                .toList();
    }

    private MaintenanceHistoryTotalsResponse computeSummary(List<MaintenanceWorkOrder> rows) {
        long preventive = 0;
        long breakdown = 0;
        long duration = 0;
        for (MaintenanceWorkOrder wo : rows) {
            if (wo.getMaintenanceType() == MaintenanceWorkOrderType.PREVENTIVE) preventive++;
            if (wo.getMaintenanceType() == MaintenanceWorkOrderType.BREAKDOWN) breakdown++;
            if (wo.getDurationMinutes() != null) duration += wo.getDurationMinutes();
        }
        return new MaintenanceHistoryTotalsResponse(rows.size(), preventive, breakdown, duration);
    }

    private List<MaintenanceHistoryEquipmentBreakdownResponse> computeEquipmentBreakdown(
            List<MaintenanceWorkOrder> rows) {
        Map<Long, MaintenanceHistoryEquipmentBreakdownResponse> map = new LinkedHashMap<>();
        for (MaintenanceWorkOrder wo : rows) {
            Long id = wo.getEquipment().getId();
            boolean preventive = wo.getMaintenanceType() == MaintenanceWorkOrderType.PREVENTIVE;
            map.merge(
                    id,
                    new MaintenanceHistoryEquipmentBreakdownResponse(
                            id,
                            wo.getEquipment().getEquipmentCode(),
                            wo.getEquipment().getEquipmentName(),
                            1,
                            preventive ? 1 : 0,
                            preventive ? 0 : 1),
                    (existing, incoming) -> new MaintenanceHistoryEquipmentBreakdownResponse(
                            existing.equipmentId(),
                            existing.equipmentCode(),
                            existing.equipmentName(),
                            existing.totalWorkOrders() + incoming.totalWorkOrders(),
                            existing.preventiveCount() + incoming.preventiveCount(),
                            existing.breakdownCount() + incoming.breakdownCount())
            );
        }
        return map.values().stream()
                .sorted(Comparator.comparing(MaintenanceHistoryEquipmentBreakdownResponse::totalWorkOrders).reversed()
                        .thenComparing(MaintenanceHistoryEquipmentBreakdownResponse::equipmentName))
                .toList();
    }

    private MaintenanceHistoryRowResponse mapRow(MaintenanceWorkOrder wo) {
        return new MaintenanceHistoryRowResponse(
                wo.getId(),
                wo.getWorkOrderNumber(),
                wo.getEquipment().getId(),
                wo.getEquipment().getEquipmentCode(),
                wo.getEquipment().getEquipmentName(),
                wo.getMaintenanceType(),
                wo.getMaintenancePlan() != null ? wo.getMaintenancePlan().getId() : null,
                wo.getMaintenancePlan() != null ? wo.getMaintenancePlan().getPlanName() : null,
                wo.getPriority(),
                wo.getAssignedTo(),
                wo.getActualStartAt(),
                wo.getActualEndAt(),
                wo.getDurationMinutes(),
                wo.getWorkPerformed(),
                wo.getMachineOperational(),
                wo.getCompletionRemarks()
        );
    }

    private DateRange normalizeRange(Organization org, LocalDate fromDate, LocalDate toDate) {
        LocalDate today = LocalDate.now(resolveOrgZone(org));
        LocalDate from = fromDate != null ? fromDate : today.withDayOfMonth(1);
        LocalDate to = toDate != null ? toDate : today;
        if (to.isBefore(from)) {
            throw new IllegalArgumentException("To Date cannot be before From Date");
        }
        return new DateRange(from, to);
    }

    private ZoneId resolveOrgZone(Organization org) {
        if (org.getTimeZone() == null || org.getTimeZone().isBlank()) {
            return ZoneId.systemDefault();
        }
        try {
            return ZoneId.of(org.getTimeZone());
        } catch (Exception ex) {
            return ZoneId.systemDefault();
        }
    }

    private Organization requireOrg(Long orgId) {
        if (orgId == null) throw new AccessDeniedException("Organization context required");
        return organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with id: " + orgId));
    }

    private static String formatOperational(Boolean value) {
        if (value == null) return "";
        return value ? "Yes" : "No";
    }

    private static String csvCell(String value) {
        if (value == null) return "";
        String escaped = value.replace("\"", "\"\"");
        if (escaped.contains(",") || escaped.contains("\"") || escaped.contains("\n")) {
            return "\"" + escaped + "\"";
        }
        return escaped;
    }

    private record DateRange(LocalDate from, LocalDate to) {}
}
