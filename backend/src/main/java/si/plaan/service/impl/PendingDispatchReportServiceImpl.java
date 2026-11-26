package si.plaan.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.response.PageResponse;
import si.plaan.dto.response.PendingDispatchReportResponse;
import si.plaan.dto.response.PendingDispatchRowResponse;
import si.plaan.dto.response.PendingDispatchTotalsResponse;
import si.plaan.entity.DeliveryScheduleStatus;
import si.plaan.entity.Organization;
import si.plaan.entity.SalesOrder;
import si.plaan.entity.SalesOrderItem;
import si.plaan.entity.SalesOrderStatus;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.OrganizationRepository;
import si.plaan.repository.SalesOrderRepository;
import si.plaan.service.PendingDispatchReportService;
import si.plaan.service.StockAvailabilityService;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class PendingDispatchReportServiceImpl implements PendingDispatchReportService {

    public static final String STOCK_READY = "READY";
    public static final String STOCK_SHORTAGE = "SHORTAGE";

    private static final Set<SalesOrderStatus> OPEN_SO_STATUSES = EnumSet.of(
            SalesOrderStatus.CONFIRMED,
            SalesOrderStatus.PARTIALLY_DISPATCHED
    );

    private final SalesOrderRepository salesOrderRepository;
    private final OrganizationRepository organizationRepository;
    private final StockAvailabilityService stockAvailabilityService;

    @Override
    @Transactional(readOnly = true)
    public PendingDispatchReportResponse getReport(
            Long orgId,
            Long customerId,
            Long itemId,
            Long warehouseId,
            DeliveryScheduleStatus deliveryStatus,
            LocalDate expectedFrom,
            LocalDate expectedTo,
            String stockAvailability,
            Pageable pageable) {
        Organization org = requireOrg(orgId);
        LocalDate today = LocalDate.now(resolveOrgZone(org));
        List<PendingDispatchRowResponse> all = buildRows(
                orgId, customerId, itemId, warehouseId, deliveryStatus,
                expectedFrom, expectedTo, stockAvailability, today);

        PendingDispatchTotalsResponse summary = computeSummary(all);

        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), all.size());
        List<PendingDispatchRowResponse> pageContent =
                start >= all.size() ? List.of() : all.subList(start, end);

        return new PendingDispatchReportResponse(
                org.getBaseCurrency() != null ? org.getBaseCurrency() : "INR",
                summary,
                PageResponse.from(new PageImpl<>(pageContent, pageable, all.size()))
        );
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportCsv(
            Long orgId,
            Long customerId,
            Long itemId,
            Long warehouseId,
            DeliveryScheduleStatus deliveryStatus,
            LocalDate expectedFrom,
            LocalDate expectedTo,
            String stockAvailability) {
        Organization org = requireOrg(orgId);
        LocalDate today = LocalDate.now(resolveOrgZone(org));
        List<PendingDispatchRowResponse> rows = buildRows(
                orgId, customerId, itemId, warehouseId, deliveryStatus,
                expectedFrom, expectedTo, stockAvailability, today);

        StringBuilder csv = new StringBuilder();
        csv.append("SO Number,Order Date,Customer,Product Code,Product Name,Dispatch Warehouse,")
                .append("Ordered Quantity,Dispatched Quantity,Pending Quantity,Available Stock,")
                .append("Shortage Quantity,UOM,Pending Value,Expected Delivery Date,Delivery Status,Days Overdue\n");
        for (PendingDispatchRowResponse row : rows) {
            csv.append(csvCell(row.orderNumber())).append(',')
                    .append(row.orderDate()).append(',')
                    .append(csvCell(row.customerName())).append(',')
                    .append(csvCell(row.itemCode())).append(',')
                    .append(csvCell(row.itemName())).append(',')
                    .append(csvCell(row.warehouseName())).append(',')
                    .append(qty(row.orderedQuantity())).append(',')
                    .append(qty(row.dispatchedQuantity())).append(',')
                    .append(qty(row.pendingQuantity())).append(',')
                    .append(qty(row.availableStock())).append(',')
                    .append(qty(row.shortageQuantity())).append(',')
                    .append(csvCell(row.unitOfMeasure())).append(',')
                    .append(qty(row.pendingValue())).append(',')
                    .append(row.expectedDeliveryDate() != null ? row.expectedDeliveryDate() : "").append(',')
                    .append(row.deliveryStatus().name()).append(',')
                    .append(row.daysOverdue() != null ? row.daysOverdue() : "")
                    .append('\n');
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private List<PendingDispatchRowResponse> buildRows(
            Long orgId,
            Long customerId,
            Long itemId,
            Long warehouseId,
            DeliveryScheduleStatus deliveryStatus,
            LocalDate expectedFrom,
            LocalDate expectedTo,
            String stockAvailability,
            LocalDate today) {
        if (expectedFrom != null && expectedTo != null && expectedTo.isBefore(expectedFrom)) {
            throw new IllegalArgumentException("Expected delivery To Date cannot be before From Date");
        }
        String stockFilter = normalizeStockFilter(stockAvailability);

        List<SalesOrder> orders = salesOrderRepository
                .findByOrganizationIdAndStatusInOrderByCreatedAtDesc(orgId, OPEN_SO_STATUSES);

        Map<String, BigDecimal> availableCache = new HashMap<>();
        List<PendingDispatchRowResponse> rows = new ArrayList<>();

        for (SalesOrder so : orders) {
            if (customerId != null && !so.getCustomer().getId().equals(customerId)) continue;
            if (warehouseId != null && !so.getDispatchWarehouse().getId().equals(warehouseId)) continue;

            LocalDate expected = so.getExpectedDeliveryDate();
            if (expectedFrom != null && (expected == null || expected.isBefore(expectedFrom))) continue;
            if (expectedTo != null && (expected == null || expected.isAfter(expectedTo))) continue;

            DeliveryScheduleStatus status = PendingPurchaseOrderReportServiceImpl.resolveDeliveryStatus(expected, today);
            if (deliveryStatus != null && status != deliveryStatus) continue;

            for (SalesOrderItem line : so.getItems()) {
                if (itemId != null && !line.getItem().getId().equals(itemId)) continue;

                BigDecimal ordered = nz(line.getOrderedQuantity());
                BigDecimal dispatched = nz(line.getDispatchedQuantity());
                BigDecimal pending = ordered.subtract(dispatched);
                if (pending.compareTo(BigDecimal.ZERO) <= 0) continue;

                String stockKey = line.getItem().getId() + ":" + so.getDispatchWarehouse().getId();
                BigDecimal available = availableCache.computeIfAbsent(stockKey,
                        key -> stockAvailabilityService.getAvailable(
                                orgId, line.getItem().getId(), so.getDispatchWarehouse().getId()));

                BigDecimal shortage = pending.subtract(available);
                if (shortage.compareTo(BigDecimal.ZERO) < 0) shortage = BigDecimal.ZERO;
                BigDecimal canDispatch = pending.min(available);
                boolean ready = shortage.compareTo(BigDecimal.ZERO) == 0;

                if (STOCK_READY.equals(stockFilter) && !ready) continue;
                if (STOCK_SHORTAGE.equals(stockFilter) && ready) continue;

                BigDecimal unitPrice = nz(line.getUnitPrice());
                BigDecimal pendingValue = pending.multiply(unitPrice).setScale(2, RoundingMode.HALF_UP);
                Integer daysOverdue = status == DeliveryScheduleStatus.OVERDUE && expected != null
                        ? (int) ChronoUnit.DAYS.between(expected, today)
                        : null;

                rows.add(new PendingDispatchRowResponse(
                        so.getId(),
                        line.getId(),
                        so.getOrderNumber(),
                        so.getOrderDate(),
                        so.getCustomer().getId(),
                        so.getCustomer().getName(),
                        line.getItem().getId(),
                        line.getItem().getItemCode(),
                        line.getItem().getName(),
                        so.getDispatchWarehouse().getId(),
                        so.getDispatchWarehouse().getName(),
                        ordered,
                        dispatched,
                        pending,
                        available,
                        shortage,
                        canDispatch,
                        line.getUnitOfMeasure(),
                        unitPrice,
                        pendingValue,
                        expected,
                        status,
                        daysOverdue,
                        ready
                ));
            }
        }

        rows.sort(Comparator
                .comparing(PendingDispatchRowResponse::deliveryStatus, deliverySort())
                .thenComparing(PendingDispatchRowResponse::expectedDeliveryDate,
                        Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(PendingDispatchRowResponse::orderNumber)
                .thenComparing(PendingDispatchRowResponse::itemCode));
        return rows;
    }

    private PendingDispatchTotalsResponse computeSummary(List<PendingDispatchRowResponse> rows) {
        Set<Long> pendingSoIds = new HashSet<>();
        Set<Long> overdueSoIds = new HashSet<>();
        BigDecimal pendingValue = BigDecimal.ZERO;
        long shortageLines = 0;
        for (PendingDispatchRowResponse row : rows) {
            pendingSoIds.add(row.salesOrderId());
            pendingValue = pendingValue.add(row.pendingValue());
            if (row.deliveryStatus() == DeliveryScheduleStatus.OVERDUE) {
                overdueSoIds.add(row.salesOrderId());
            }
            if (row.shortageQuantity().compareTo(BigDecimal.ZERO) > 0) {
                shortageLines++;
            }
        }
        return new PendingDispatchTotalsResponse(
                pendingSoIds.size(),
                overdueSoIds.size(),
                pendingValue,
                shortageLines
        );
    }

    private String normalizeStockFilter(String stockAvailability) {
        if (stockAvailability == null || stockAvailability.isBlank()) return null;
        String normalized = stockAvailability.trim().toUpperCase(Locale.ROOT);
        if (!STOCK_READY.equals(normalized) && !STOCK_SHORTAGE.equals(normalized)) {
            throw new IllegalArgumentException("Stock availability filter must be READY or SHORTAGE");
        }
        return normalized;
    }

    private Comparator<DeliveryScheduleStatus> deliverySort() {
        return Comparator.comparingInt(status -> switch (status) {
            case OVERDUE -> 0;
            case DUE_TODAY -> 1;
            case UPCOMING -> 2;
            case NOT_SCHEDULED -> 3;
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

    private static BigDecimal nz(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private static String qty(BigDecimal value) {
        return value != null ? value.stripTrailingZeros().toPlainString() : "0";
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
