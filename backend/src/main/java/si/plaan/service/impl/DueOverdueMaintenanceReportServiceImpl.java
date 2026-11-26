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
import si.plaan.dto.response.DueOverdueMaintenanceReportResponse;
import si.plaan.dto.response.DueOverdueMaintenanceRowResponse;
import si.plaan.dto.response.DueOverdueMaintenanceTotalsResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.entity.EquipmentRecordStatus;
import si.plaan.entity.MaintenancePlan;
import si.plaan.entity.MaintenancePlanStatus;
import si.plaan.entity.MaintenanceScheduleStatus;
import si.plaan.entity.MaintenanceWorkOrder;
import si.plaan.entity.MaintenanceWorkOrderStatus;
import si.plaan.entity.Organization;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.MaintenancePlanRepository;
import si.plaan.repository.MaintenanceWorkOrderRepository;
import si.plaan.repository.OrganizationRepository;
import si.plaan.service.DueOverdueMaintenanceReportService;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class DueOverdueMaintenanceReportServiceImpl implements DueOverdueMaintenanceReportService {

    public static final String WO_NOT_CREATED = "NOT_CREATED";
    public static final String WO_OPEN = "OPEN";
    public static final String WO_IN_PROGRESS = "IN_PROGRESS";

    private static final Set<MaintenanceWorkOrderStatus> UNRESOLVED = EnumSet.of(
            MaintenanceWorkOrderStatus.OPEN,
            MaintenanceWorkOrderStatus.IN_PROGRESS
    );

    private final MaintenancePlanRepository maintenancePlanRepository;
    private final MaintenanceWorkOrderRepository workOrderRepository;
    private final OrganizationRepository organizationRepository;

    @Override
    @Transactional(readOnly = true)
    public DueOverdueMaintenanceReportResponse getReport(
            Long orgId,
            Long equipmentId,
            MaintenanceScheduleStatus dueStatus,
            LocalDate nextDueFrom,
            LocalDate nextDueTo,
            String workOrderStatus,
            Pageable pageable) {
        Organization org = requireOrg(orgId);
        LocalDate today = LocalDate.now(resolveOrgZone(org));
        List<DueOverdueMaintenanceRowResponse> all = buildRows(
                orgId, equipmentId, dueStatus, nextDueFrom, nextDueTo, workOrderStatus, today);

        DueOverdueMaintenanceTotalsResponse summary = computeSummary(all);

        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), all.size());
        List<DueOverdueMaintenanceRowResponse> pageContent =
                start >= all.size() ? List.of() : all.subList(start, end);

        return new DueOverdueMaintenanceReportResponse(
                org.getBaseCurrency() != null ? org.getBaseCurrency() : "INR",
                summary,
                PageResponse.from(new PageImpl<>(pageContent, pageable, all.size()))
        );
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportCsv(
            Long orgId,
            Long equipmentId,
            MaintenanceScheduleStatus dueStatus,
            LocalDate nextDueFrom,
            LocalDate nextDueTo,
            String workOrderStatus) {
        Organization org = requireOrg(orgId);
        LocalDate today = LocalDate.now(resolveOrgZone(org));
        List<DueOverdueMaintenanceRowResponse> rows = buildRows(
                orgId, equipmentId, dueStatus, nextDueFrom, nextDueTo, workOrderStatus, today);

        StringBuilder csv = new StringBuilder();
        csv.append("Maintenance Plan Number,Equipment Code,Equipment Name,Maintenance Plan Name,")
                .append("Frequency (days),Last Completed Date,Next Due Date,Due Status,Days Overdue,")
                .append("Work Order Number,Work Order Status\n");
        for (DueOverdueMaintenanceRowResponse row : rows) {
            csv.append(csvCell(row.planNumber())).append(',')
                    .append(csvCell(row.equipmentCode())).append(',')
                    .append(csvCell(row.equipmentName())).append(',')
                    .append(csvCell(row.planName())).append(',')
                    .append(row.frequencyDays() != null ? row.frequencyDays() : "").append(',')
                    .append(row.lastCompletedDate() != null ? row.lastCompletedDate() : "").append(',')
                    .append(row.nextDueDate()).append(',')
                    .append(row.dueStatus().name()).append(',')
                    .append(row.daysOverdue() != null ? row.daysOverdue() : "").append(',')
                    .append(csvCell(row.workOrderNumber())).append(',')
                    .append(row.workOrderStatus() != null ? row.workOrderStatus().name() : "Not Created")
                    .append('\n');
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private List<DueOverdueMaintenanceRowResponse> buildRows(
            Long orgId,
            Long equipmentId,
            MaintenanceScheduleStatus dueStatus,
            LocalDate nextDueFrom,
            LocalDate nextDueTo,
            String workOrderStatus,
            LocalDate today) {
        validateDateRange(nextDueFrom, nextDueTo);
        String woFilter = normalizeWorkOrderStatusFilter(workOrderStatus);

        Map<Long, MaintenanceWorkOrder> openByPlan = new HashMap<>();
        for (MaintenanceWorkOrder wo : workOrderRepository
                .findByOrganizationIdAndStatusInAndMaintenancePlanNotNull(orgId, UNRESOLVED)) {
            openByPlan.putIfAbsent(wo.getMaintenancePlan().getId(), wo);
        }

        List<MaintenancePlan> plans = maintenancePlanRepository.findAll(
                buildSpec(orgId, equipmentId, nextDueFrom, nextDueTo),
                Sort.by(Sort.Direction.ASC, "nextDueDate", "id"));

        List<DueOverdueMaintenanceRowResponse> rows = new ArrayList<>();
        for (MaintenancePlan plan : plans) {
            MaintenanceScheduleStatus status =
                    MaintenancePlanServiceImpl.resolveScheduleStatus(plan.getNextDueDate(), today);
            if (dueStatus != null && status != dueStatus) continue;

            MaintenanceWorkOrder linked = openByPlan.get(plan.getId());
            if (!matchesWorkOrderFilter(linked, woFilter)) continue;

            Integer daysOverdue = status == MaintenanceScheduleStatus.OVERDUE
                    ? (int) ChronoUnit.DAYS.between(plan.getNextDueDate(), today)
                    : null;

            rows.add(new DueOverdueMaintenanceRowResponse(
                    plan.getId(),
                    plan.getPlanNumber(),
                    plan.getEquipment().getId(),
                    plan.getEquipment().getEquipmentCode(),
                    plan.getEquipment().getEquipmentName(),
                    plan.getPlanName(),
                    plan.getFrequencyDays(),
                    plan.getLastCompletedDate(),
                    plan.getNextDueDate(),
                    status,
                    daysOverdue,
                    linked != null ? linked.getId() : null,
                    linked != null ? linked.getWorkOrderNumber() : null,
                    linked != null ? linked.getStatus() : null
            ));
        }

        rows.sort(Comparator
                .comparing(DueOverdueMaintenanceRowResponse::dueStatus, dueSort())
                .thenComparing(DueOverdueMaintenanceRowResponse::nextDueDate)
                .thenComparing(DueOverdueMaintenanceRowResponse::planNumber));
        return rows;
    }

    private Specification<MaintenancePlan> buildSpec(
            Long orgId,
            Long equipmentId,
            LocalDate nextDueFrom,
            LocalDate nextDueTo) {
        return (root, query, cb) -> {
            if (MaintenancePlan.class.equals(query.getResultType())) {
                root.fetch("equipment", JoinType.INNER);
            }
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("organization").get("id"), orgId));
            predicates.add(cb.equal(root.get("status"), MaintenancePlanStatus.ACTIVE));
            predicates.add(cb.equal(
                    root.get("equipment").get("recordStatus"), EquipmentRecordStatus.ACTIVE));
            if (equipmentId != null) {
                predicates.add(cb.equal(root.get("equipment").get("id"), equipmentId));
            }
            if (nextDueFrom != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("nextDueDate"), nextDueFrom));
            }
            if (nextDueTo != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("nextDueDate"), nextDueTo));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private DueOverdueMaintenanceTotalsResponse computeSummary(
            List<DueOverdueMaintenanceRowResponse> rows) {
        long overdue = 0;
        long dueToday = 0;
        long upcoming = 0;
        for (DueOverdueMaintenanceRowResponse row : rows) {
            switch (row.dueStatus()) {
                case OVERDUE -> overdue++;
                case DUE_TODAY -> dueToday++;
                case UPCOMING -> upcoming++;
            }
        }
        return new DueOverdueMaintenanceTotalsResponse(rows.size(), overdue, dueToday, upcoming);
    }

    private boolean matchesWorkOrderFilter(MaintenanceWorkOrder linked, String filter) {
        if (filter == null) return true;
        if (WO_NOT_CREATED.equals(filter)) return linked == null;
        if (WO_OPEN.equals(filter)) {
            return linked != null && linked.getStatus() == MaintenanceWorkOrderStatus.OPEN;
        }
        if (WO_IN_PROGRESS.equals(filter)) {
            return linked != null && linked.getStatus() == MaintenanceWorkOrderStatus.IN_PROGRESS;
        }
        return true;
    }

    private String normalizeWorkOrderStatusFilter(String workOrderStatus) {
        if (workOrderStatus == null || workOrderStatus.isBlank()) return null;
        String normalized = workOrderStatus.trim().toUpperCase(Locale.ROOT);
        if (!WO_NOT_CREATED.equals(normalized)
                && !WO_OPEN.equals(normalized)
                && !WO_IN_PROGRESS.equals(normalized)) {
            throw new IllegalArgumentException(
                    "Work order status filter must be NOT_CREATED, OPEN or IN_PROGRESS");
        }
        return normalized;
    }

    private void validateDateRange(LocalDate from, LocalDate to) {
        if (from != null && to != null && to.isBefore(from)) {
            throw new IllegalArgumentException("Next Due To Date cannot be before From Date");
        }
    }

    private Comparator<MaintenanceScheduleStatus> dueSort() {
        return Comparator.comparingInt(status -> switch (status) {
            case OVERDUE -> 0;
            case DUE_TODAY -> 1;
            case UPCOMING -> 2;
        });
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

    private static String csvCell(String value) {
        if (value == null) return "";
        String escaped = value.replace("\"", "\"\"");
        if (escaped.contains(",") || escaped.contains("\"") || escaped.contains("\n")) {
            return "\"" + escaped + "\"";
        }
        return escaped;
    }
}
