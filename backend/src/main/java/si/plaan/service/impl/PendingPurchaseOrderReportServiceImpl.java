package si.plaan.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.response.PageResponse;
import si.plaan.dto.response.PendingPurchaseOrderReportResponse;
import si.plaan.dto.response.PendingPurchaseOrderRowResponse;
import si.plaan.dto.response.PendingPurchaseOrderTotalsResponse;
import si.plaan.entity.*;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.GoodsReceiptItemRepository;
import si.plaan.repository.OrganizationRepository;
import si.plaan.repository.PurchaseOrderRepository;
import si.plaan.service.PendingPurchaseOrderReportService;

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
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class PendingPurchaseOrderReportServiceImpl implements PendingPurchaseOrderReportService {

    private static final Set<PurchaseOrderStatus> OPEN_PO_STATUSES = EnumSet.of(
            PurchaseOrderStatus.ISSUED,
            PurchaseOrderStatus.PARTIALLY_RECEIVED
    );

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final GoodsReceiptItemRepository goodsReceiptItemRepository;
    private final OrganizationRepository organizationRepository;

    @Override
    @Transactional(readOnly = true)
    public PendingPurchaseOrderReportResponse getReport(
            Long orgId,
            Long supplierId,
            Long itemId,
            Long warehouseId,
            DeliveryScheduleStatus deliveryStatus,
            LocalDate expectedFrom,
            LocalDate expectedTo,
            Pageable pageable) {
        Organization org = requireOrg(orgId);
        LocalDate today = LocalDate.now(resolveOrgZone(org));
        List<PendingPurchaseOrderRowResponse> all = buildRows(
                orgId, supplierId, itemId, warehouseId, deliveryStatus, expectedFrom, expectedTo, today);

        PendingPurchaseOrderTotalsResponse summary = computeSummary(all);

        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), all.size());
        List<PendingPurchaseOrderRowResponse> pageContent =
                start >= all.size() ? List.of() : all.subList(start, end);

        return new PendingPurchaseOrderReportResponse(
                org.getBaseCurrency() != null ? org.getBaseCurrency() : "INR",
                summary,
                PageResponse.from(new PageImpl<>(pageContent, pageable, all.size()))
        );
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportCsv(
            Long orgId,
            Long supplierId,
            Long itemId,
            Long warehouseId,
            DeliveryScheduleStatus deliveryStatus,
            LocalDate expectedFrom,
            LocalDate expectedTo) {
        Organization org = requireOrg(orgId);
        LocalDate today = LocalDate.now(resolveOrgZone(org));
        List<PendingPurchaseOrderRowResponse> rows = buildRows(
                orgId, supplierId, itemId, warehouseId, deliveryStatus, expectedFrom, expectedTo, today);

        StringBuilder csv = new StringBuilder();
        csv.append("PO Number,PO Date,Supplier,Item Code,Item Name,Receiving Warehouse,")
                .append("Ordered Quantity,Received Quantity,Pending Quantity,UOM,Pending Value,")
                .append("Expected Delivery Date,Delivery Status,Days Overdue\n");
        for (PendingPurchaseOrderRowResponse row : rows) {
            csv.append(csvCell(row.poNumber())).append(',')
                    .append(row.orderDate()).append(',')
                    .append(csvCell(row.supplierName())).append(',')
                    .append(csvCell(row.itemCode())).append(',')
                    .append(csvCell(row.itemName())).append(',')
                    .append(csvCell(row.warehouseName())).append(',')
                    .append(row.orderedQuantity().toPlainString()).append(',')
                    .append(row.receivedQuantity().toPlainString()).append(',')
                    .append(row.pendingQuantity().toPlainString()).append(',')
                    .append(csvCell(row.unitOfMeasure())).append(',')
                    .append(row.pendingValue().toPlainString()).append(',')
                    .append(row.expectedDeliveryDate() != null ? row.expectedDeliveryDate() : "").append(',')
                    .append(row.deliveryStatus().name()).append(',')
                    .append(row.daysOverdue() != null ? row.daysOverdue() : "")
                    .append('\n');
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private List<PendingPurchaseOrderRowResponse> buildRows(
            Long orgId,
            Long supplierId,
            Long itemId,
            Long warehouseId,
            DeliveryScheduleStatus deliveryStatus,
            LocalDate expectedFrom,
            LocalDate expectedTo,
            LocalDate today) {
        if (expectedFrom != null && expectedTo != null && expectedTo.isBefore(expectedFrom)) {
            throw new IllegalArgumentException("Expected delivery To Date cannot be before From Date");
        }

        List<PurchaseOrder> orders = purchaseOrderRepository
                .findByOrganizationIdAndStatusInOrderByCreatedAtDesc(orgId, OPEN_PO_STATUSES);

        List<PurchaseOrderItem> candidateItems = new ArrayList<>();
        for (PurchaseOrder po : orders) {
            if (supplierId != null && !po.getSupplier().getId().equals(supplierId)) continue;
            if (warehouseId != null && !po.getReceivingWarehouse().getId().equals(warehouseId)) continue;
            for (PurchaseOrderItem line : po.getItems()) {
                if (itemId != null && !line.getItem().getId().equals(itemId)) continue;
                candidateItems.add(line);
            }
        }

        Map<Long, BigDecimal> receivedByItemId = loadReceivedQuantities(
                candidateItems.stream().map(PurchaseOrderItem::getId).toList());

        List<PendingPurchaseOrderRowResponse> rows = new ArrayList<>();
        for (PurchaseOrderItem line : candidateItems) {
            PurchaseOrder po = line.getPurchaseOrder();
            BigDecimal ordered = line.getQuantity() != null ? line.getQuantity() : BigDecimal.ZERO;
            BigDecimal received = receivedByItemId.getOrDefault(line.getId(), BigDecimal.ZERO);
            BigDecimal pending = ordered.subtract(received);
            if (pending.compareTo(BigDecimal.ZERO) <= 0) continue;

            LocalDate expected = po.getExpectedDeliveryDate();
            if (expectedFrom != null && (expected == null || expected.isBefore(expectedFrom))) continue;
            if (expectedTo != null && (expected == null || expected.isAfter(expectedTo))) continue;

            DeliveryScheduleStatus status = resolveDeliveryStatus(expected, today);
            if (deliveryStatus != null && status != deliveryStatus) continue;

            BigDecimal unitPrice = line.getUnitPrice() != null ? line.getUnitPrice() : BigDecimal.ZERO;
            BigDecimal pendingValue = pending.multiply(unitPrice).setScale(2, RoundingMode.HALF_UP);
            Integer daysOverdue = status == DeliveryScheduleStatus.OVERDUE && expected != null
                    ? (int) ChronoUnit.DAYS.between(expected, today)
                    : null;

            rows.add(new PendingPurchaseOrderRowResponse(
                    po.getId(),
                    line.getId(),
                    po.getPoNumber(),
                    po.getOrderDate(),
                    po.getSupplier().getId(),
                    po.getSupplier().getName(),
                    line.getItem().getId(),
                    line.getItem().getItemCode(),
                    line.getItem().getName(),
                    po.getReceivingWarehouse().getId(),
                    po.getReceivingWarehouse().getName(),
                    ordered,
                    received,
                    pending,
                    line.getUnitOfMeasure(),
                    unitPrice,
                    pendingValue,
                    expected,
                    status,
                    daysOverdue
            ));
        }

        rows.sort(Comparator
                .comparing(PendingPurchaseOrderRowResponse::deliveryStatus, deliverySort())
                .thenComparing(PendingPurchaseOrderRowResponse::expectedDeliveryDate,
                        Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(PendingPurchaseOrderRowResponse::poNumber)
                .thenComparing(PendingPurchaseOrderRowResponse::itemCode));
        return rows;
    }

    private Map<Long, BigDecimal> loadReceivedQuantities(List<Long> poItemIds) {
        Map<Long, BigDecimal> map = new HashMap<>();
        if (poItemIds.isEmpty()) return map;
        // Batch in chunks to keep IN clause reasonable
        int chunk = 500;
        for (int i = 0; i < poItemIds.size(); i += chunk) {
            List<Long> slice = poItemIds.subList(i, Math.min(i + chunk, poItemIds.size()));
            for (Object[] row : goodsReceiptItemRepository.sumPostedReceivedQuantityByPoItemIds(slice)) {
                map.put((Long) row[0], (BigDecimal) row[1]);
            }
        }
        return map;
    }

    private PendingPurchaseOrderTotalsResponse computeSummary(List<PendingPurchaseOrderRowResponse> rows) {
        Set<Long> pendingPoIds = new HashSet<>();
        Set<Long> overduePoIds = new HashSet<>();
        BigDecimal pendingValue = BigDecimal.ZERO;
        for (PendingPurchaseOrderRowResponse row : rows) {
            pendingPoIds.add(row.purchaseOrderId());
            pendingValue = pendingValue.add(row.pendingValue());
            if (row.deliveryStatus() == DeliveryScheduleStatus.OVERDUE) {
                overduePoIds.add(row.purchaseOrderId());
            }
        }
        return new PendingPurchaseOrderTotalsResponse(
                pendingPoIds.size(),
                pendingValue,
                overduePoIds.size()
        );
    }

    public static DeliveryScheduleStatus resolveDeliveryStatus(LocalDate expected, LocalDate today) {
        if (expected == null) return DeliveryScheduleStatus.NOT_SCHEDULED;
        if (expected.isEqual(today)) return DeliveryScheduleStatus.DUE_TODAY;
        if (expected.isBefore(today)) return DeliveryScheduleStatus.OVERDUE;
        return DeliveryScheduleStatus.UPCOMING;
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

    private static String csvCell(String value) {
        if (value == null) return "";
        String escaped = value.replace("\"", "\"\"");
        if (escaped.contains(",") || escaped.contains("\"") || escaped.contains("\n")) {
            return "\"" + escaped + "\"";
        }
        return escaped;
    }
}
