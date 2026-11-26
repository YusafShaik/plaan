package si.plaan.service.impl;

import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.response.PageResponse;
import si.plaan.dto.response.ProductionSummaryProductProgressResponse;
import si.plaan.dto.response.ProductionSummaryReportResponse;
import si.plaan.dto.response.ProductionSummaryRowResponse;
import si.plaan.dto.response.ProductionSummaryTotalsResponse;
import si.plaan.entity.ProductionOrder;
import si.plaan.entity.ProductionOrderStatus;
import si.plaan.repository.ProductionOrderRepository;
import si.plaan.service.ProductionSummaryReportService;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ProductionSummaryReportServiceImpl implements ProductionSummaryReportService {

    private static final Set<ProductionOrderStatus> REPORTABLE = EnumSet.of(
            ProductionOrderStatus.RELEASED,
            ProductionOrderStatus.IN_PROGRESS,
            ProductionOrderStatus.COMPLETED,
            ProductionOrderStatus.CLOSED
    );

    private final ProductionOrderRepository productionOrderRepository;

    @Override
    @Transactional(readOnly = true)
    public ProductionSummaryReportResponse getReport(
            Long orgId,
            LocalDate fromDate,
            LocalDate toDate,
            Long productId,
            Long sourceWarehouseId,
            Long finishedGoodsWarehouseId,
            ProductionOrderStatus status,
            Pageable pageable) {
        requireOrg(orgId);
        DateRange range = normalizeRange(fromDate, toDate);
        validateStatusFilter(status);

        Specification<ProductionOrder> spec = buildSpec(
                orgId, range.from(), range.to(), productId, sourceWarehouseId, finishedGoodsWarehouseId, status);

        List<ProductionOrder> allMatching = productionOrderRepository.findAll(
                spec, Sort.by(Sort.Direction.DESC, "orderDate", "id"));
        ProductionSummaryTotalsResponse summary = computeSummary(allMatching);
        List<ProductionSummaryProductProgressResponse> byProduct = computeProductProgress(allMatching);

        Pageable safePageable = pageable.getSort().isSorted()
                ? pageable
                : PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "orderDate", "id"));
        Page<ProductionOrder> page = productionOrderRepository.findAll(spec, safePageable);

        return new ProductionSummaryReportResponse(
                summary,
                byProduct,
                PageResponse.from(page.map(this::mapRow))
        );
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportCsv(
            Long orgId,
            LocalDate fromDate,
            LocalDate toDate,
            Long productId,
            Long sourceWarehouseId,
            Long finishedGoodsWarehouseId,
            ProductionOrderStatus status) {
        requireOrg(orgId);
        DateRange range = normalizeRange(fromDate, toDate);
        validateStatusFilter(status);

        Specification<ProductionOrder> spec = buildSpec(
                orgId, range.from(), range.to(), productId, sourceWarehouseId, finishedGoodsWarehouseId, status);
        List<ProductionOrder> rows = productionOrderRepository.findAll(
                spec, Sort.by(Sort.Direction.DESC, "orderDate", "id"));

        StringBuilder csv = new StringBuilder();
        csv.append("Order Number,Order Date,Product Code,Product Name,Planned Quantity,Produced Quantity,")
                .append("Pending Quantity,UOM,Completion %,Planned Completion Date,Status\n");
        for (ProductionOrder order : rows) {
            csv.append(csvCell(order.getOrderNumber())).append(',')
                    .append(order.getOrderDate()).append(',')
                    .append(csvCell(order.getProduct().getItemCode())).append(',')
                    .append(csvCell(order.getProduct().getName())).append(',')
                    .append(qty(order.getProductionQuantity())).append(',')
                    .append(qty(order.getReceivedQuantity())).append(',')
                    .append(qty(order.getPendingProductionQuantity())).append(',')
                    .append(csvCell(order.getUnitOfMeasure())).append(',')
                    .append(qty(order.getProductionProgress())).append(',')
                    .append(order.getPlannedEndDate() != null ? order.getPlannedEndDate() : "").append(',')
                    .append(order.getStatus().name())
                    .append('\n');
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private Specification<ProductionOrder> buildSpec(
            Long orgId,
            LocalDate from,
            LocalDate to,
            Long productId,
            Long sourceWarehouseId,
            Long finishedGoodsWarehouseId,
            ProductionOrderStatus status) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("organization").get("id"), orgId));
            predicates.add(cb.greaterThanOrEqualTo(root.get("orderDate"), from));
            predicates.add(cb.lessThanOrEqualTo(root.get("orderDate"), to));

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            } else {
                predicates.add(root.get("status").in(REPORTABLE));
            }

            if (productId != null) {
                predicates.add(cb.equal(root.get("product").get("id"), productId));
            }
            if (sourceWarehouseId != null) {
                predicates.add(cb.equal(root.get("sourceWarehouse").get("id"), sourceWarehouseId));
            }
            if (finishedGoodsWarehouseId != null) {
                predicates.add(cb.equal(root.get("finishedGoodsWarehouse").get("id"), finishedGoodsWarehouseId));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private ProductionSummaryTotalsResponse computeSummary(List<ProductionOrder> orders) {
        long released = 0;
        long inProgress = 0;
        long completedOrClosed = 0;
        for (ProductionOrder order : orders) {
            switch (order.getStatus()) {
                case RELEASED -> released++;
                case IN_PROGRESS -> inProgress++;
                case COMPLETED, CLOSED -> completedOrClosed++;
                default -> { }
            }
        }
        return new ProductionSummaryTotalsResponse(orders.size(), released, inProgress, completedOrClosed);
    }

    private List<ProductionSummaryProductProgressResponse> computeProductProgress(List<ProductionOrder> orders) {
        Map<Long, Acc> map = new LinkedHashMap<>();
        for (ProductionOrder order : orders) {
            Long productId = order.getProduct().getId();
            Acc acc = map.computeIfAbsent(productId, id -> new Acc(
                    order.getProduct().getItemCode(),
                    order.getProduct().getName(),
                    order.getUnitOfMeasure()
            ));
            acc.planned = acc.planned.add(nz(order.getProductionQuantity()));
            acc.produced = acc.produced.add(nz(order.getReceivedQuantity()));
        }

        return map.entrySet().stream()
                .map(entry -> {
                    Acc acc = entry.getValue();
                    BigDecimal pending = acc.planned.subtract(acc.produced);
                    if (pending.compareTo(BigDecimal.ZERO) < 0) pending = BigDecimal.ZERO;
                    return new ProductionSummaryProductProgressResponse(
                            entry.getKey(),
                            acc.productCode,
                            acc.productName,
                            acc.planned,
                            acc.produced,
                            pending,
                            completionPercent(acc.produced, acc.planned),
                            acc.unitOfMeasure
                    );
                })
                .sorted(Comparator.comparing(ProductionSummaryProductProgressResponse::productName,
                        String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    private ProductionSummaryRowResponse mapRow(ProductionOrder order) {
        return new ProductionSummaryRowResponse(
                order.getId(),
                order.getOrderNumber(),
                order.getOrderDate(),
                order.getProduct().getId(),
                order.getProduct().getItemCode(),
                order.getProduct().getName(),
                nz(order.getProductionQuantity()),
                order.getReceivedQuantity(),
                order.getPendingProductionQuantity(),
                order.getUnitOfMeasure(),
                order.getProductionProgress(),
                order.getPlannedEndDate(),
                order.getStatus()
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

    private static BigDecimal nz(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private static BigDecimal completionPercent(BigDecimal produced, BigDecimal planned) {
        if (planned == null || planned.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal progress = nz(produced).multiply(new BigDecimal("100"))
                .divide(planned, 2, RoundingMode.HALF_UP);
        if (progress.compareTo(new BigDecimal("100")) > 0) {
            return new BigDecimal("100.00");
        }
        return progress;
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

    private static final class Acc {
        final String productCode;
        final String productName;
        final String unitOfMeasure;
        BigDecimal planned = BigDecimal.ZERO;
        BigDecimal produced = BigDecimal.ZERO;

        Acc(String productCode, String productName, String unitOfMeasure) {
            this.productCode = productCode;
            this.productName = productName;
            this.unitOfMeasure = unitOfMeasure;
        }
    }

    private record DateRange(LocalDate from, LocalDate to) {}
}
