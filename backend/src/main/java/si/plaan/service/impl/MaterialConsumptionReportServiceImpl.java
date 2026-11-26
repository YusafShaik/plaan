package si.plaan.service.impl;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.response.MaterialConsumptionGroupResponse;
import si.plaan.dto.response.MaterialConsumptionLineResponse;
import si.plaan.dto.response.MaterialConsumptionReportResponse;
import si.plaan.dto.response.MaterialConsumptionTotalsResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.entity.ProductionOrder;
import si.plaan.entity.ProductionOrderItem;
import si.plaan.entity.ProductionOrderStatus;
import si.plaan.repository.ProductionOrderItemRepository;
import si.plaan.service.MaterialConsumptionReportService;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class MaterialConsumptionReportServiceImpl implements MaterialConsumptionReportService {

    private static final Set<ProductionOrderStatus> REPORTABLE = EnumSet.of(
            ProductionOrderStatus.RELEASED,
            ProductionOrderStatus.IN_PROGRESS,
            ProductionOrderStatus.COMPLETED,
            ProductionOrderStatus.CLOSED
    );

    private final ProductionOrderItemRepository productionOrderItemRepository;

    @Override
    @Transactional(readOnly = true)
    public MaterialConsumptionReportResponse getReport(
            Long orgId,
            LocalDate fromDate,
            LocalDate toDate,
            Long productionOrderId,
            Long productId,
            Long materialId,
            Long sourceWarehouseId,
            ProductionOrderStatus status,
            Boolean unreconciledOnly,
            Pageable pageable) {
        requireOrg(orgId);
        DateRange range = normalizeRange(fromDate, toDate);
        validateStatusFilter(status);
        boolean onlyUnreconciled = Boolean.TRUE.equals(unreconciledOnly);

        List<MaterialConsumptionGroupResponse> groups = buildGroups(
                orgId, range.from(), range.to(), productionOrderId, productId, materialId,
                sourceWarehouseId, status, onlyUnreconciled);

        MaterialConsumptionTotalsResponse summary = computeSummary(groups);

        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), groups.size());
        List<MaterialConsumptionGroupResponse> pageContent =
                start >= groups.size() ? List.of() : groups.subList(start, end);

        return new MaterialConsumptionReportResponse(
                summary,
                PageResponse.from(new PageImpl<>(pageContent, pageable, groups.size()))
        );
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportCsv(
            Long orgId,
            LocalDate fromDate,
            LocalDate toDate,
            Long productionOrderId,
            Long productId,
            Long materialId,
            Long sourceWarehouseId,
            ProductionOrderStatus status,
            Boolean unreconciledOnly) {
        requireOrg(orgId);
        DateRange range = normalizeRange(fromDate, toDate);
        validateStatusFilter(status);
        boolean onlyUnreconciled = Boolean.TRUE.equals(unreconciledOnly);

        List<MaterialConsumptionGroupResponse> groups = buildGroups(
                orgId, range.from(), range.to(), productionOrderId, productId, materialId,
                sourceWarehouseId, status, onlyUnreconciled);

        StringBuilder csv = new StringBuilder();
        csv.append("Order Number,Order Date,Finished Product Code,Finished Product Name,")
                .append("Source Warehouse,Status,Material Code,Material Name,")
                .append("Required,Issued,Consumed,Returned,Remaining,UOM\n");

        for (MaterialConsumptionGroupResponse group : groups) {
            for (MaterialConsumptionLineResponse line : group.lines()) {
                csv.append(csvCell(group.orderNumber())).append(',')
                        .append(group.orderDate()).append(',')
                        .append(csvCell(group.productCode())).append(',')
                        .append(csvCell(group.productName())).append(',')
                        .append(csvCell(group.sourceWarehouseName())).append(',')
                        .append(group.status().name()).append(',')
                        .append(csvCell(line.materialCode())).append(',')
                        .append(csvCell(line.materialName())).append(',')
                        .append(qty(line.requiredQuantity())).append(',')
                        .append(qty(line.issuedQuantity())).append(',')
                        .append(qty(line.consumedQuantity())).append(',')
                        .append(qty(line.returnedQuantity())).append(',')
                        .append(qty(line.remainingQuantity())).append(',')
                        .append(csvCell(line.unitOfMeasure()))
                        .append('\n');
            }
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private List<MaterialConsumptionGroupResponse> buildGroups(
            Long orgId,
            LocalDate from,
            LocalDate to,
            Long productionOrderId,
            Long productId,
            Long materialId,
            Long sourceWarehouseId,
            ProductionOrderStatus status,
            boolean onlyUnreconciled) {
        Specification<ProductionOrderItem> spec = buildSpec(
                orgId, from, to, productionOrderId, productId, materialId, sourceWarehouseId, status, onlyUnreconciled);

        List<ProductionOrderItem> items = productionOrderItemRepository.findAll(spec);
        items.sort(Comparator
                .comparing((ProductionOrderItem it) -> it.getProductionOrder().getOrderDate(),
                        Comparator.reverseOrder())
                .thenComparing((ProductionOrderItem it) -> it.getProductionOrder().getId(),
                        Comparator.reverseOrder())
                .thenComparing(it -> it.getMaterial().getName(), String.CASE_INSENSITIVE_ORDER)
                .thenComparing(ProductionOrderItem::getId));

        Map<Long, List<ProductionOrderItem>> byOrder = new LinkedHashMap<>();
        for (ProductionOrderItem item : items) {
            byOrder.computeIfAbsent(item.getProductionOrder().getId(), ignored -> new ArrayList<>()).add(item);
        }

        List<MaterialConsumptionGroupResponse> groups = new ArrayList<>();
        for (List<ProductionOrderItem> orderItems : byOrder.values()) {
            ProductionOrder order = orderItems.get(0).getProductionOrder();
            List<MaterialConsumptionLineResponse> lines = orderItems.stream()
                    .map(this::mapLine)
                    .toList();
            groups.add(new MaterialConsumptionGroupResponse(
                    order.getId(),
                    order.getOrderNumber(),
                    order.getOrderDate(),
                    order.getProduct().getId(),
                    order.getProduct().getItemCode(),
                    order.getProduct().getName(),
                    order.getProductionQuantity(),
                    order.getUnitOfMeasure(),
                    order.getSourceWarehouse().getId(),
                    order.getSourceWarehouse().getName(),
                    order.getStatus(),
                    lines
            ));
        }
        return groups;
    }

    private Specification<ProductionOrderItem> buildSpec(
            Long orgId,
            LocalDate from,
            LocalDate to,
            Long productionOrderId,
            Long productId,
            Long materialId,
            Long sourceWarehouseId,
            ProductionOrderStatus status,
            boolean onlyUnreconciled) {
        return (root, query, cb) -> {
            if (query != null && !Long.class.equals(query.getResultType()) && !long.class.equals(query.getResultType())) {
                root.fetch("material", JoinType.LEFT);
                var orderFetch = root.fetch("productionOrder", JoinType.LEFT);
                orderFetch.fetch("product", JoinType.LEFT);
                orderFetch.fetch("sourceWarehouse", JoinType.LEFT);
                query.distinct(true);
            }

            Join<ProductionOrderItem, ProductionOrder> order = root.join("productionOrder", JoinType.INNER);
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(order.get("organization").get("id"), orgId));
            predicates.add(cb.greaterThanOrEqualTo(order.get("orderDate"), from));
            predicates.add(cb.lessThanOrEqualTo(order.get("orderDate"), to));

            if (status != null) {
                predicates.add(cb.equal(order.get("status"), status));
            } else {
                predicates.add(order.get("status").in(REPORTABLE));
            }

            if (productionOrderId != null) {
                predicates.add(cb.equal(order.get("id"), productionOrderId));
            }
            if (productId != null) {
                predicates.add(cb.equal(order.get("product").get("id"), productId));
            }
            if (sourceWarehouseId != null) {
                predicates.add(cb.equal(order.get("sourceWarehouse").get("id"), sourceWarehouseId));
            }
            if (materialId != null) {
                predicates.add(cb.equal(root.get("material").get("id"), materialId));
            }
            if (onlyUnreconciled) {
                // remaining = issued - consumed - returned > 0
                predicates.add(cb.greaterThan(
                        cb.diff(
                                cb.coalesce(root.get("issuedQuantity"), BigDecimal.ZERO),
                                cb.sum(
                                        cb.coalesce(root.get("consumedQuantity"), BigDecimal.ZERO),
                                        cb.coalesce(root.get("returnedQuantity"), BigDecimal.ZERO)
                                )
                        ),
                        BigDecimal.ZERO
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private MaterialConsumptionTotalsResponse computeSummary(List<MaterialConsumptionGroupResponse> groups) {
        Set<Long> materialIds = new LinkedHashSet<>();
        long unreconciled = 0;
        for (MaterialConsumptionGroupResponse group : groups) {
            for (MaterialConsumptionLineResponse line : group.lines()) {
                materialIds.add(line.materialId());
                if (line.unreconciled()) unreconciled++;
            }
        }
        return new MaterialConsumptionTotalsResponse(groups.size(), materialIds.size(), unreconciled);
    }

    private MaterialConsumptionLineResponse mapLine(ProductionOrderItem item) {
        BigDecimal remaining = item.getRemainingQuantity();
        return new MaterialConsumptionLineResponse(
                item.getId(),
                item.getMaterial().getId(),
                item.getMaterial().getItemCode(),
                item.getMaterial().getName(),
                item.getRequiredQuantity(),
                item.getIssuedQuantity(),
                item.getConsumedQuantity(),
                item.getReturnedQuantity(),
                remaining,
                item.getUnitOfMeasure(),
                remaining.compareTo(BigDecimal.ZERO) > 0
        );
    }

    private void validateStatusFilter(ProductionOrderStatus status) {
        if (status != null && !REPORTABLE.contains(status)) {
            throw new IllegalArgumentException(
                    "Status filter must be RELEASED, IN_PROGRESS, COMPLETED, or CLOSED");
        }
    }

    private DateRange normalizeRange(LocalDate fromDate, LocalDate toDate) {
        LocalDate today = LocalDate.now();
        LocalDate from = fromDate != null ? fromDate : today.withDayOfMonth(1);
        LocalDate to = toDate != null ? toDate : today;
        if (to.isBefore(from)) {
            throw new IllegalArgumentException("To Date cannot be before From Date");
        }
        return new DateRange(from, to);
    }

    private void requireOrg(Long orgId) {
        if (orgId == null) throw new AccessDeniedException("Organization context required");
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

    private record DateRange(LocalDate from, LocalDate to) {}
}
