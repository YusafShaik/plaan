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
import si.plaan.dto.response.PurchaseSummaryReportResponse;
import si.plaan.dto.response.PurchaseSummaryRowResponse;
import si.plaan.dto.response.PurchaseSummarySupplierBreakdownResponse;
import si.plaan.dto.response.PurchaseSummaryTotalsResponse;
import si.plaan.entity.Organization;
import si.plaan.entity.PurchaseOrder;
import si.plaan.entity.PurchaseOrderStatus;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.OrganizationRepository;
import si.plaan.repository.PurchaseOrderRepository;
import si.plaan.service.PurchaseSummaryReportService;

import java.math.BigDecimal;
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
public class PurchaseSummaryReportServiceImpl implements PurchaseSummaryReportService {

    private static final Set<PurchaseOrderStatus> REPORTABLE = EnumSet.of(
            PurchaseOrderStatus.ISSUED,
            PurchaseOrderStatus.PARTIALLY_RECEIVED,
            PurchaseOrderStatus.COMPLETED
    );

    private static final Set<PurchaseOrderStatus> PENDING = EnumSet.of(
            PurchaseOrderStatus.ISSUED,
            PurchaseOrderStatus.PARTIALLY_RECEIVED
    );

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final OrganizationRepository organizationRepository;

    @Override
    @Transactional(readOnly = true)
    public PurchaseSummaryReportResponse getReport(
            Long orgId,
            LocalDate fromDate,
            LocalDate toDate,
            Long supplierId,
            Long warehouseId,
            PurchaseOrderStatus status,
            Pageable pageable) {
        Organization org = requireOrg(orgId);
        DateRange range = normalizeRange(fromDate, toDate);
        validateStatusFilter(status);

        Specification<PurchaseOrder> spec = buildSpec(orgId, range.from(), range.to(), supplierId, warehouseId, status);

        List<PurchaseOrder> allMatching = purchaseOrderRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "orderDate", "id"));
        PurchaseSummaryTotalsResponse summary = computeSummary(allMatching);
        List<PurchaseSummarySupplierBreakdownResponse> bySupplier = computeSupplierBreakdown(allMatching);

        Pageable safePageable = pageable.getSort().isSorted()
                ? pageable
                : PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "orderDate", "id"));
        Page<PurchaseOrder> page = purchaseOrderRepository.findAll(spec, safePageable);

        return new PurchaseSummaryReportResponse(
                org.getBaseCurrency() != null ? org.getBaseCurrency() : "INR",
                summary,
                bySupplier,
                PageResponse.from(page.map(this::mapRow))
        );
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportCsv(
            Long orgId,
            LocalDate fromDate,
            LocalDate toDate,
            Long supplierId,
            Long warehouseId,
            PurchaseOrderStatus status) {
        requireOrg(orgId);
        DateRange range = normalizeRange(fromDate, toDate);
        validateStatusFilter(status);

        Specification<PurchaseOrder> spec = buildSpec(orgId, range.from(), range.to(), supplierId, warehouseId, status);
        List<PurchaseOrder> rows = purchaseOrderRepository.findAll(
                spec, Sort.by(Sort.Direction.DESC, "orderDate", "id"));

        StringBuilder csv = new StringBuilder();
        csv.append("PO Number,PO Date,Supplier,Warehouse,Expected Delivery Date,Order Value,Status\n");
        for (PurchaseOrder po : rows) {
            csv.append(csvCell(po.getPoNumber())).append(',')
                    .append(po.getOrderDate()).append(',')
                    .append(csvCell(po.getSupplier().getName())).append(',')
                    .append(csvCell(po.getReceivingWarehouse().getName())).append(',')
                    .append(po.getExpectedDeliveryDate() != null ? po.getExpectedDeliveryDate() : "").append(',')
                    .append(po.getTotalAmount() != null ? po.getTotalAmount().toPlainString() : "0").append(',')
                    .append(po.getStatus().name())
                    .append('\n');
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private Specification<PurchaseOrder> buildSpec(
            Long orgId,
            LocalDate from,
            LocalDate to,
            Long supplierId,
            Long warehouseId,
            PurchaseOrderStatus status) {
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

            if (supplierId != null) {
                predicates.add(cb.equal(root.get("supplier").get("id"), supplierId));
            }
            if (warehouseId != null) {
                predicates.add(cb.equal(root.get("receivingWarehouse").get("id"), warehouseId));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private PurchaseSummaryTotalsResponse computeSummary(List<PurchaseOrder> orders) {
        BigDecimal totalValue = BigDecimal.ZERO;
        long fullyReceived = 0;
        long pending = 0;
        for (PurchaseOrder po : orders) {
            if (po.getTotalAmount() != null) {
                totalValue = totalValue.add(po.getTotalAmount());
            }
            if (po.getStatus() == PurchaseOrderStatus.COMPLETED) {
                fullyReceived++;
            } else if (PENDING.contains(po.getStatus())) {
                pending++;
            }
        }
        return new PurchaseSummaryTotalsResponse(orders.size(), totalValue, fullyReceived, pending);
    }

    private List<PurchaseSummarySupplierBreakdownResponse> computeSupplierBreakdown(List<PurchaseOrder> orders) {
        Map<Long, PurchaseSummarySupplierBreakdownResponse> map = new LinkedHashMap<>();
        for (PurchaseOrder po : orders) {
            Long supplierId = po.getSupplier().getId();
            BigDecimal amount = po.getTotalAmount() != null ? po.getTotalAmount() : BigDecimal.ZERO;
            map.merge(
                    supplierId,
                    new PurchaseSummarySupplierBreakdownResponse(supplierId, po.getSupplier().getName(), amount),
                    (existing, incoming) -> new PurchaseSummarySupplierBreakdownResponse(
                            existing.supplierId(),
                            existing.supplierName(),
                            existing.orderValue().add(incoming.orderValue())
                    )
            );
        }
        return map.values().stream()
                .sorted(Comparator.comparing(PurchaseSummarySupplierBreakdownResponse::orderValue).reversed())
                .toList();
    }

    private PurchaseSummaryRowResponse mapRow(PurchaseOrder po) {
        return new PurchaseSummaryRowResponse(
                po.getId(),
                po.getPoNumber(),
                po.getOrderDate(),
                po.getSupplier().getId(),
                po.getSupplier().getName(),
                po.getReceivingWarehouse().getId(),
                po.getReceivingWarehouse().getName(),
                po.getExpectedDeliveryDate(),
                po.getTotalAmount(),
                po.getStatus()
        );
    }

    private void validateStatusFilter(PurchaseOrderStatus status) {
        if (status != null && !REPORTABLE.contains(status)) {
            throw new IllegalArgumentException(
                    "Status filter must be ISSUED, PARTIALLY_RECEIVED, or COMPLETED");
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
