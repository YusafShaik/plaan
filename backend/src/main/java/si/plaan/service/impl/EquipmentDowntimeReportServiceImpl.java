package si.plaan.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.response.EquipmentDowntimeBreakdownResponse;
import si.plaan.dto.response.EquipmentDowntimeReportResponse;
import si.plaan.dto.response.EquipmentDowntimeRowResponse;
import si.plaan.dto.response.EquipmentDowntimeTotalsResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.entity.MaintenanceWorkOrder;
import si.plaan.entity.MaintenanceWorkOrderStatus;
import si.plaan.entity.Organization;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.MaintenanceWorkOrderRepository;
import si.plaan.repository.OrganizationRepository;
import si.plaan.service.EquipmentDowntimeReportService;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class EquipmentDowntimeReportServiceImpl implements EquipmentDowntimeReportService {

    public static final String STATUS_RESTORED = "RESTORED";
    public static final String STATUS_ONGOING = "ONGOING";

    private final MaintenanceWorkOrderRepository workOrderRepository;
    private final OrganizationRepository organizationRepository;

    @Override
    @Transactional(readOnly = true)
    public EquipmentDowntimeReportResponse getReport(
            Long orgId,
            LocalDate fromDate,
            LocalDate toDate,
            Long equipmentId,
            String restorationStatus,
            Pageable pageable) {
        Organization org = requireOrg(orgId);
        ZoneId zone = resolveOrgZone(org);
        DateRange range = normalizeRange(zone, fromDate, toDate);
        LocalDateTime now = LocalDateTime.now(zone);

        List<EquipmentDowntimeRowResponse> all = buildRows(
                orgId, range, equipmentId, restorationStatus, now);

        EquipmentDowntimeTotalsResponse summary = computeSummary(all);
        List<EquipmentDowntimeBreakdownResponse> byEquipment = computeEquipmentBreakdown(all);

        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), all.size());
        List<EquipmentDowntimeRowResponse> pageContent =
                start >= all.size() ? List.of() : all.subList(start, end);

        return new EquipmentDowntimeReportResponse(
                org.getBaseCurrency() != null ? org.getBaseCurrency() : "INR",
                range.from(),
                range.to(),
                summary,
                byEquipment,
                PageResponse.from(new PageImpl<>(pageContent, pageable, all.size()))
        );
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportCsv(
            Long orgId,
            LocalDate fromDate,
            LocalDate toDate,
            Long equipmentId,
            String restorationStatus) {
        Organization org = requireOrg(orgId);
        ZoneId zone = resolveOrgZone(org);
        DateRange range = normalizeRange(zone, fromDate, toDate);
        LocalDateTime now = LocalDateTime.now(zone);
        List<EquipmentDowntimeRowResponse> rows = buildRows(
                orgId, range, equipmentId, restorationStatus, now);

        StringBuilder csv = new StringBuilder();
        csv.append("Work Order Number,Equipment Code,Equipment Name,Breakdown Date & Time,")
                .append("Maintenance Start,Restoration Date & Time,Downtime Duration (minutes),")
                .append("Downtime in Period (minutes),Breakdown Description,Restoration Status\n");
        for (EquipmentDowntimeRowResponse row : rows) {
            csv.append(csvCell(row.workOrderNumber())).append(',')
                    .append(csvCell(row.equipmentCode())).append(',')
                    .append(csvCell(row.equipmentName())).append(',')
                    .append(row.breakdownAt() != null ? row.breakdownAt() : "").append(',')
                    .append(row.maintenanceStartAt() != null ? row.maintenanceStartAt() : "").append(',')
                    .append(row.restorationAt() != null ? row.restorationAt() : "").append(',')
                    .append(row.downtimeMinutes() != null ? row.downtimeMinutes() : "").append(',')
                    .append(row.downtimeInPeriodMinutes() != null ? row.downtimeInPeriodMinutes() : "").append(',')
                    .append(csvCell(row.breakdownDescription())).append(',')
                    .append(row.restorationStatus())
                    .append('\n');
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private List<EquipmentDowntimeRowResponse> buildRows(
            Long orgId,
            DateRange range,
            Long equipmentId,
            String restorationStatus,
            LocalDateTime now) {
        String statusFilter = normalizeRestorationStatus(restorationStatus);
        LocalDateTime rangeStart = range.from().atStartOfDay();
        LocalDateTime rangeEnd = range.to().atTime(LocalTime.MAX);

        List<MaintenanceWorkOrder> breakdowns = workOrderRepository.findActiveBreakdownWorkOrders(orgId);
        Map<Long, List<MaintenanceWorkOrder>> byRoot = new HashMap<>();
        Map<Long, MaintenanceWorkOrder> roots = new HashMap<>();

        for (MaintenanceWorkOrder wo : breakdowns) {
            if (equipmentId != null && !wo.getEquipment().getId().equals(equipmentId)) continue;
            MaintenanceWorkOrder root = wo.getRootBreakdownWorkOrder() != null
                    ? wo.getRootBreakdownWorkOrder()
                    : wo;
            roots.putIfAbsent(root.getId(), root);
            byRoot.computeIfAbsent(root.getId(), key -> new ArrayList<>()).add(wo);
        }

        // Ensure root itself is in the chain list even if only follow-ups matched fetch quirks
        for (Map.Entry<Long, MaintenanceWorkOrder> entry : roots.entrySet()) {
            List<MaintenanceWorkOrder> chain = byRoot.computeIfAbsent(entry.getKey(), key -> new ArrayList<>());
            boolean hasRoot = chain.stream().anyMatch(wo -> wo.getId().equals(entry.getKey()));
            if (!hasRoot) chain.add(entry.getValue());
        }

        List<EquipmentDowntimeRowResponse> rows = new ArrayList<>();
        for (Map.Entry<Long, List<MaintenanceWorkOrder>> entry : byRoot.entrySet()) {
            MaintenanceWorkOrder root = roots.get(entry.getKey());
            if (root == null || root.getBreakdownDate() == null || root.getBreakdownTime() == null) {
                continue;
            }
            List<MaintenanceWorkOrder> chain = entry.getValue();
            LocalDateTime breakdownAt = LocalDateTime.of(root.getBreakdownDate(), root.getBreakdownTime());

            LocalDateTime restorationAt = chain.stream()
                    .filter(wo -> wo.getStatus() == MaintenanceWorkOrderStatus.COMPLETED)
                    .filter(wo -> Boolean.TRUE.equals(wo.getMachineOperational()))
                    .map(MaintenanceWorkOrder::getActualEndAt)
                    .filter(Objects::nonNull)
                    .min(Comparator.naturalOrder())
                    .orElse(null);

            boolean restored = restorationAt != null;
            String status = restored ? STATUS_RESTORED : STATUS_ONGOING;
            if (statusFilter != null && !statusFilter.equals(status)) continue;

            LocalDateTime eventEnd = restored ? restorationAt : now;
            if (eventEnd.isBefore(breakdownAt)) continue;
            if (!overlaps(breakdownAt, eventEnd, rangeStart, rangeEnd)) continue;

            LocalDateTime maintenanceStart = chain.stream()
                    .map(MaintenanceWorkOrder::getActualStartAt)
                    .filter(Objects::nonNull)
                    .min(Comparator.naturalOrder())
                    .orElse(null);

            int downtimeMinutes = (int) Duration.between(breakdownAt, eventEnd).toMinutes();
            int inPeriod = minutesInRange(breakdownAt, eventEnd, rangeStart, rangeEnd);

            rows.add(new EquipmentDowntimeRowResponse(
                    root.getId(),
                    root.getWorkOrderNumber(),
                    root.getEquipment().getId(),
                    root.getEquipment().getEquipmentCode(),
                    root.getEquipment().getEquipmentName(),
                    breakdownAt,
                    maintenanceStart,
                    restorationAt,
                    downtimeMinutes,
                    inPeriod,
                    root.getProblemDescription(),
                    status
            ));
        }

        rows.sort(Comparator
                .comparing(EquipmentDowntimeRowResponse::breakdownAt).reversed()
                .thenComparing(EquipmentDowntimeRowResponse::workOrderNumber));
        return rows;
    }

    private EquipmentDowntimeTotalsResponse computeSummary(List<EquipmentDowntimeRowResponse> rows) {
        long downtime = 0;
        long restored = 0;
        long ongoing = 0;
        for (EquipmentDowntimeRowResponse row : rows) {
            downtime += row.downtimeInPeriodMinutes() != null ? row.downtimeInPeriodMinutes() : 0;
            if (STATUS_RESTORED.equals(row.restorationStatus())) restored++;
            else ongoing++;
        }
        return new EquipmentDowntimeTotalsResponse(rows.size(), downtime, restored, ongoing);
    }

    private List<EquipmentDowntimeBreakdownResponse> computeEquipmentBreakdown(
            List<EquipmentDowntimeRowResponse> rows) {
        Map<Long, EquipmentDowntimeBreakdownResponse> map = new LinkedHashMap<>();
        for (EquipmentDowntimeRowResponse row : rows) {
            long minutes = row.downtimeInPeriodMinutes() != null ? row.downtimeInPeriodMinutes() : 0;
            map.merge(
                    row.equipmentId(),
                    new EquipmentDowntimeBreakdownResponse(
                            row.equipmentId(),
                            row.equipmentCode(),
                            row.equipmentName(),
                            minutes,
                            1),
                    (existing, incoming) -> new EquipmentDowntimeBreakdownResponse(
                            existing.equipmentId(),
                            existing.equipmentCode(),
                            existing.equipmentName(),
                            existing.downtimeMinutes() + incoming.downtimeMinutes(),
                            existing.eventCount() + incoming.eventCount())
            );
        }
        return map.values().stream()
                .sorted(Comparator.comparing(EquipmentDowntimeBreakdownResponse::downtimeMinutes).reversed()
                        .thenComparing(EquipmentDowntimeBreakdownResponse::equipmentName))
                .toList();
    }

    private boolean overlaps(
            LocalDateTime eventStart,
            LocalDateTime eventEnd,
            LocalDateTime rangeStart,
            LocalDateTime rangeEnd) {
        return !eventStart.isAfter(rangeEnd) && !eventEnd.isBefore(rangeStart);
    }

    private int minutesInRange(
            LocalDateTime eventStart,
            LocalDateTime eventEnd,
            LocalDateTime rangeStart,
            LocalDateTime rangeEnd) {
        LocalDateTime start = eventStart.isAfter(rangeStart) ? eventStart : rangeStart;
        LocalDateTime end = eventEnd.isBefore(rangeEnd) ? eventEnd : rangeEnd;
        if (end.isBefore(start)) return 0;
        return (int) Duration.between(start, end).toMinutes();
    }

    private String normalizeRestorationStatus(String restorationStatus) {
        if (restorationStatus == null || restorationStatus.isBlank()) return null;
        String normalized = restorationStatus.trim().toUpperCase(Locale.ROOT);
        if (!STATUS_RESTORED.equals(normalized) && !STATUS_ONGOING.equals(normalized)) {
            throw new IllegalArgumentException("Restoration status must be RESTORED or ONGOING");
        }
        return normalized;
    }

    private DateRange normalizeRange(ZoneId zone, LocalDate fromDate, LocalDate toDate) {
        LocalDate today = LocalDate.now(zone);
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
