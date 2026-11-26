package si.plaan.service.impl;

import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.response.InspectionSummaryItemPerformanceResponse;
import si.plaan.dto.response.InspectionSummaryReportResponse;
import si.plaan.dto.response.InspectionSummaryRowResponse;
import si.plaan.dto.response.InspectionSummaryTotalsResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.entity.FinishedGoodsInspection;
import si.plaan.entity.FinishedGoodsInspectionStatus;
import si.plaan.entity.IncomingInspection;
import si.plaan.entity.IncomingInspectionStatus;
import si.plaan.entity.InspectionType;
import si.plaan.repository.FinishedGoodsInspectionRepository;
import si.plaan.repository.IncomingInspectionRepository;
import si.plaan.service.InspectionSummaryReportService;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class InspectionSummaryReportServiceImpl implements InspectionSummaryReportService {

    private static final Set<String> REPORTABLE_STATUSES = Set.of("PENDING", "DRAFT", "COMPLETED");

    private final IncomingInspectionRepository incomingInspectionRepository;
    private final FinishedGoodsInspectionRepository finishedGoodsInspectionRepository;

    @Override
    @Transactional(readOnly = true)
    public InspectionSummaryReportResponse getReport(
            Long orgId,
            LocalDate fromDate,
            LocalDate toDate,
            InspectionType inspectionType,
            Long itemId,
            Long warehouseId,
            String status,
            Pageable pageable) {
        requireOrg(orgId);
        validateDateRange(fromDate, toDate);
        String normalizedStatus = normalizeStatus(status);

        List<InspectionSummaryRowResponse> rows = loadRows(
                orgId, fromDate, toDate, inspectionType, itemId, warehouseId, normalizedStatus);

        InspectionSummaryTotalsResponse summary = computeSummary(rows);
        List<InspectionSummaryItemPerformanceResponse> byItem = computeItemPerformance(rows);

        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), rows.size());
        List<InspectionSummaryRowResponse> pageContent =
                start >= rows.size() ? List.of() : rows.subList(start, end);

        return new InspectionSummaryReportResponse(
                summary,
                byItem,
                PageResponse.from(new PageImpl<>(pageContent, pageable, rows.size()))
        );
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportCsv(
            Long orgId,
            LocalDate fromDate,
            LocalDate toDate,
            InspectionType inspectionType,
            Long itemId,
            Long warehouseId,
            String status) {
        requireOrg(orgId);
        validateDateRange(fromDate, toDate);
        String normalizedStatus = normalizeStatus(status);

        List<InspectionSummaryRowResponse> rows = loadRows(
                orgId, fromDate, toDate, inspectionType, itemId, warehouseId, normalizedStatus);

        StringBuilder csv = new StringBuilder();
        csv.append("Inspection Number,Inspection Date,Inspection Type,Source Reference,")
                .append("Item Code,Item Name,Warehouse,Inspection Quantity,Accepted Quantity,")
                .append("Rejected Quantity,UOM,Acceptance Rate,Rejection Rate,Inspected By,Status\n");
        for (InspectionSummaryRowResponse row : rows) {
            csv.append(csvCell(row.inspectionNumber())).append(',')
                    .append(row.inspectionDate() != null ? row.inspectionDate() : "").append(',')
                    .append(typeLabel(row.inspectionType())).append(',')
                    .append(csvCell(row.sourceReference())).append(',')
                    .append(csvCell(row.itemCode())).append(',')
                    .append(csvCell(row.itemName())).append(',')
                    .append(csvCell(row.warehouseName())).append(',')
                    .append(qty(row.inspectionQuantity())).append(',')
                    .append(qtyOrBlank(row.acceptedQuantity())).append(',')
                    .append(qtyOrBlank(row.rejectedQuantity())).append(',')
                    .append(csvCell(row.unitOfMeasure())).append(',')
                    .append(qtyOrBlank(row.acceptanceRate())).append(',')
                    .append(qtyOrBlank(row.rejectionRate())).append(',')
                    .append(csvCell(row.inspectedByName())).append(',')
                    .append(row.status())
                    .append('\n');
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private List<InspectionSummaryRowResponse> loadRows(
            Long orgId,
            LocalDate from,
            LocalDate to,
            InspectionType inspectionType,
            Long itemId,
            Long warehouseId,
            String status) {
        List<InspectionSummaryRowResponse> rows = new ArrayList<>();

        if (inspectionType == null || inspectionType == InspectionType.INCOMING) {
            IncomingInspectionStatus iqcStatus = status != null
                    ? IncomingInspectionStatus.valueOf(status) : null;
            List<IncomingInspection> incoming = incomingInspectionRepository.findAll(
                    buildIncomingSpec(orgId, from, to, itemId, warehouseId, iqcStatus));
            for (IncomingInspection i : incoming) {
                rows.add(mapIncoming(i));
            }
        }

        if (inspectionType == null || inspectionType == InspectionType.FINISHED_GOODS) {
            FinishedGoodsInspectionStatus fgiStatus = status != null
                    ? FinishedGoodsInspectionStatus.valueOf(status) : null;
            List<FinishedGoodsInspection> finished = finishedGoodsInspectionRepository.findAll(
                    buildFinishedSpec(orgId, from, to, itemId, warehouseId, fgiStatus));
            for (FinishedGoodsInspection i : finished) {
                rows.add(mapFinished(i));
            }
        }

        rows.sort(Comparator
                .comparing(InspectionSummaryRowResponse::inspectionDate,
                        Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(InspectionSummaryRowResponse::inspectionNumber,
                        Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER).reversed())
                .thenComparing(InspectionSummaryRowResponse::id, Comparator.reverseOrder()));
        return rows;
    }

    private Specification<IncomingInspection> buildIncomingSpec(
            Long orgId,
            LocalDate from,
            LocalDate to,
            Long itemId,
            Long warehouseId,
            IncomingInspectionStatus status) {
        return (root, query, cb) -> {
            if (query != null && !Long.class.equals(query.getResultType()) && !long.class.equals(query.getResultType())) {
                root.fetch("item", jakarta.persistence.criteria.JoinType.LEFT);
                root.fetch("warehouse", jakarta.persistence.criteria.JoinType.LEFT);
                root.fetch("goodsReceipt", jakarta.persistence.criteria.JoinType.LEFT);
                root.fetch("inspectedBy", jakarta.persistence.criteria.JoinType.LEFT);
                query.distinct(true);
            }
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("organization").get("id"), orgId));
            if (from != null) predicates.add(cb.greaterThanOrEqualTo(root.get("inspectionDate"), from));
            if (to != null) predicates.add(cb.lessThanOrEqualTo(root.get("inspectionDate"), to));
            if (itemId != null) predicates.add(cb.equal(root.get("item").get("id"), itemId));
            if (warehouseId != null) predicates.add(cb.equal(root.get("warehouse").get("id"), warehouseId));
            if (status != null) predicates.add(cb.equal(root.get("status"), status));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Specification<FinishedGoodsInspection> buildFinishedSpec(
            Long orgId,
            LocalDate from,
            LocalDate to,
            Long itemId,
            Long warehouseId,
            FinishedGoodsInspectionStatus status) {
        return (root, query, cb) -> {
            if (query != null && !Long.class.equals(query.getResultType()) && !long.class.equals(query.getResultType())) {
                root.fetch("item", jakarta.persistence.criteria.JoinType.LEFT);
                root.fetch("warehouse", jakarta.persistence.criteria.JoinType.LEFT);
                root.fetch("productionReceipt", jakarta.persistence.criteria.JoinType.LEFT);
                root.fetch("inspectedBy", jakarta.persistence.criteria.JoinType.LEFT);
                query.distinct(true);
            }
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("organization").get("id"), orgId));
            if (from != null) predicates.add(cb.greaterThanOrEqualTo(root.get("inspectionDate"), from));
            if (to != null) predicates.add(cb.lessThanOrEqualTo(root.get("inspectionDate"), to));
            if (itemId != null) predicates.add(cb.equal(root.get("item").get("id"), itemId));
            if (warehouseId != null) predicates.add(cb.equal(root.get("warehouse").get("id"), warehouseId));
            if (status != null) predicates.add(cb.equal(root.get("status"), status));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private InspectionSummaryRowResponse mapIncoming(IncomingInspection i) {
        boolean completed = i.getStatus() == IncomingInspectionStatus.COMPLETED;
        BigDecimal inspected = nz(i.getReceivedQuantity());
        BigDecimal accepted = completed ? i.getAcceptedQuantity() : null;
        BigDecimal rejected = completed ? i.getRejectedQuantity() : null;
        return new InspectionSummaryRowResponse(
                i.getId(),
                InspectionType.INCOMING,
                i.getInspectionNumber(),
                i.getInspectionDate(),
                i.getItem().getId(),
                i.getItem().getItemCode(),
                i.getItem().getName(),
                i.getWarehouse().getId(),
                i.getWarehouse().getWarehouseCode(),
                i.getWarehouse().getName(),
                i.getGoodsReceipt() != null ? i.getGoodsReceipt().getGrnNumber() : null,
                inspected,
                accepted,
                rejected,
                i.getUnitOfMeasure(),
                completed ? rate(accepted, inspected) : null,
                completed ? rate(rejected, inspected) : null,
                i.getInspectedBy() != null ? i.getInspectedBy().getFullName() : null,
                i.getStatus().name()
        );
    }

    private InspectionSummaryRowResponse mapFinished(FinishedGoodsInspection i) {
        boolean completed = i.getStatus() == FinishedGoodsInspectionStatus.COMPLETED;
        BigDecimal inspected = nz(i.getReceivedQuantity());
        BigDecimal accepted = completed ? i.getAcceptedQuantity() : null;
        BigDecimal rejected = completed ? i.getRejectedQuantity() : null;
        return new InspectionSummaryRowResponse(
                i.getId(),
                InspectionType.FINISHED_GOODS,
                i.getInspectionNumber(),
                i.getInspectionDate(),
                i.getItem().getId(),
                i.getItem().getItemCode(),
                i.getItem().getName(),
                i.getWarehouse().getId(),
                i.getWarehouse().getWarehouseCode(),
                i.getWarehouse().getName(),
                i.getProductionReceipt() != null ? i.getProductionReceipt().getReceiptNumber() : null,
                inspected,
                accepted,
                rejected,
                i.getUnitOfMeasure(),
                completed ? rate(accepted, inspected) : null,
                completed ? rate(rejected, inspected) : null,
                i.getInspectedBy() != null ? i.getInspectedBy().getFullName() : null,
                i.getStatus().name()
        );
    }

    private InspectionSummaryTotalsResponse computeSummary(List<InspectionSummaryRowResponse> rows) {
        long completed = 0;
        long awaiting = 0;
        long withRejections = 0;
        for (InspectionSummaryRowResponse row : rows) {
            if ("COMPLETED".equals(row.status())) {
                completed++;
                if (row.rejectedQuantity() != null && row.rejectedQuantity().compareTo(BigDecimal.ZERO) > 0) {
                    withRejections++;
                }
            } else {
                awaiting++;
            }
        }
        return new InspectionSummaryTotalsResponse(rows.size(), completed, awaiting, withRejections);
    }

    private List<InspectionSummaryItemPerformanceResponse> computeItemPerformance(
            List<InspectionSummaryRowResponse> rows) {
        Map<String, Acc> map = new LinkedHashMap<>();
        for (InspectionSummaryRowResponse row : rows) {
            if (!"COMPLETED".equals(row.status())) continue;
            String key = row.inspectionType().name() + ":" + row.itemId();
            Acc acc = map.computeIfAbsent(key, ignored -> new Acc(
                    row.itemId(),
                    row.itemCode(),
                    row.itemName(),
                    row.inspectionType(),
                    row.unitOfMeasure()
            ));
            acc.inspected = acc.inspected.add(nz(row.inspectionQuantity()));
            acc.accepted = acc.accepted.add(nz(row.acceptedQuantity()));
            acc.rejected = acc.rejected.add(nz(row.rejectedQuantity()));
        }

        return map.values().stream()
                .map(acc -> new InspectionSummaryItemPerformanceResponse(
                        acc.itemId,
                        acc.itemCode,
                        acc.itemName,
                        acc.inspectionType,
                        acc.inspected,
                        acc.accepted,
                        acc.rejected,
                        rate(acc.accepted, acc.inspected),
                        rate(acc.rejected, acc.inspected),
                        acc.unitOfMeasure
                ))
                .sorted(Comparator
                        .comparing((InspectionSummaryItemPerformanceResponse p) -> p.itemName(),
                                String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(p -> p.inspectionType().name()))
                .toList();
    }

    private String normalizeStatus(String status) {
        if (status == null || status.isBlank()) return null;
        String normalized = status.trim().toUpperCase(Locale.ROOT);
        if (!REPORTABLE_STATUSES.contains(normalized)) {
            throw new IllegalArgumentException("Status filter must be PENDING, DRAFT, or COMPLETED");
        }
        return normalized;
    }

    private void validateDateRange(LocalDate fromDate, LocalDate toDate) {
        if (fromDate != null && toDate != null && toDate.isBefore(fromDate)) {
            throw new IllegalArgumentException("To Date cannot be before From Date");
        }
    }

    private void requireOrg(Long orgId) {
        if (orgId == null) throw new AccessDeniedException("Organization context required");
    }

    private static BigDecimal nz(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private static BigDecimal rate(BigDecimal part, BigDecimal whole) {
        if (whole == null || whole.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO.setScale(1, RoundingMode.HALF_UP);
        }
        return nz(part).multiply(new BigDecimal("100"))
                .divide(whole, 1, RoundingMode.HALF_UP);
    }

    private static String typeLabel(InspectionType type) {
        return type == InspectionType.FINISHED_GOODS ? "Finished Goods" : "Incoming";
    }

    private static String qty(BigDecimal value) {
        return value != null ? value.stripTrailingZeros().toPlainString() : "0";
    }

    private static String qtyOrBlank(BigDecimal value) {
        return value != null ? value.stripTrailingZeros().toPlainString() : "";
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
        final Long itemId;
        final String itemCode;
        final String itemName;
        final InspectionType inspectionType;
        final String unitOfMeasure;
        BigDecimal inspected = BigDecimal.ZERO;
        BigDecimal accepted = BigDecimal.ZERO;
        BigDecimal rejected = BigDecimal.ZERO;

        Acc(Long itemId, String itemCode, String itemName, InspectionType inspectionType, String unitOfMeasure) {
            this.itemId = itemId;
            this.itemCode = itemCode;
            this.itemName = itemName;
            this.inspectionType = inspectionType;
            this.unitOfMeasure = unitOfMeasure;
        }
    }
}
