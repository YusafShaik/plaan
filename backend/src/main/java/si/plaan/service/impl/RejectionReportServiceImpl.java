package si.plaan.service.impl;

import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.response.PageResponse;
import si.plaan.dto.response.RejectionReportResponse;
import si.plaan.dto.response.RejectionReportRowResponse;
import si.plaan.dto.response.RejectionReportTotalsResponse;
import si.plaan.entity.FinishedGoodsInspection;
import si.plaan.entity.FinishedGoodsInspectionStatus;
import si.plaan.entity.IncomingInspection;
import si.plaan.entity.IncomingInspectionStatus;
import si.plaan.entity.InspectionParameterResult;
import si.plaan.entity.InspectionType;
import si.plaan.repository.FinishedGoodsInspectionRepository;
import si.plaan.repository.IncomingInspectionRepository;
import si.plaan.service.RejectionReportService;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RejectionReportServiceImpl implements RejectionReportService {

    private final IncomingInspectionRepository incomingInspectionRepository;
    private final FinishedGoodsInspectionRepository finishedGoodsInspectionRepository;

    @Override
    @Transactional(readOnly = true)
    public RejectionReportResponse getReport(
            Long orgId,
            LocalDate fromDate,
            LocalDate toDate,
            InspectionType inspectionType,
            Long itemId,
            Long warehouseId,
            Long supplierId,
            Long productionOrderId,
            Pageable pageable) {
        requireOrg(orgId);
        validateDateRange(fromDate, toDate);

        List<RejectionReportRowResponse> rows = loadRejectionRows(
                orgId, fromDate, toDate, inspectionType, itemId, warehouseId, supplierId, productionOrderId);

        RejectionReportTotalsResponse summary = computeSummary(rows);

        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), rows.size());
        List<RejectionReportRowResponse> pageContent =
                start >= rows.size() ? List.of() : rows.subList(start, end);

        // Remarks panel shows all matching rejections (typically small), not only the current page.
        List<RejectionReportRowResponse> remarks = rows.stream()
                .filter(r -> (r.remarks() != null && !r.remarks().isBlank())
                        || (r.failedParameters() != null && !r.failedParameters().isEmpty()))
                .toList();

        return new RejectionReportResponse(
                summary,
                PageResponse.from(new PageImpl<>(pageContent, pageable, rows.size())),
                remarks
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
            Long supplierId,
            Long productionOrderId) {
        requireOrg(orgId);
        validateDateRange(fromDate, toDate);

        List<RejectionReportRowResponse> rows = loadRejectionRows(
                orgId, fromDate, toDate, inspectionType, itemId, warehouseId, supplierId, productionOrderId);

        StringBuilder csv = new StringBuilder();
        csv.append("Inspection Number,Completion Date,Inspection Type,Item Code,Item Name,Warehouse,")
                .append("Supplier,Production Order,Source Reference,Inspected Quantity,Accepted Quantity,")
                .append("Rejected Quantity,UOM,Rejection Rate,Remarks,Failed Parameters,Inspected By\n");
        for (RejectionReportRowResponse row : rows) {
            csv.append(csvCell(row.inspectionNumber())).append(',')
                    .append(row.completionDate() != null ? row.completionDate() : "").append(',')
                    .append(typeLabel(row.inspectionType())).append(',')
                    .append(csvCell(row.itemCode())).append(',')
                    .append(csvCell(row.itemName())).append(',')
                    .append(csvCell(row.warehouseName())).append(',')
                    .append(csvCell(row.supplierName())).append(',')
                    .append(csvCell(row.productionOrderNumber())).append(',')
                    .append(csvCell(row.sourceReference())).append(',')
                    .append(qty(row.inspectedQuantity())).append(',')
                    .append(qty(row.acceptedQuantity())).append(',')
                    .append(qty(row.rejectedQuantity())).append(',')
                    .append(csvCell(row.unitOfMeasure())).append(',')
                    .append(qty(row.rejectionRate())).append(',')
                    .append(csvCell(row.remarks())).append(',')
                    .append(csvCell(String.join("; ", row.failedParameters()))).append(',')
                    .append(csvCell(row.inspectedByName()))
                    .append('\n');
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private List<RejectionReportRowResponse> loadRejectionRows(
            Long orgId,
            LocalDate from,
            LocalDate to,
            InspectionType inspectionType,
            Long itemId,
            Long warehouseId,
            Long supplierId,
            Long productionOrderId) {
        List<RejectionReportRowResponse> rows = new ArrayList<>();

        boolean includeIncoming = (inspectionType == null || inspectionType == InspectionType.INCOMING)
                && productionOrderId == null;
        boolean includeFinished = (inspectionType == null || inspectionType == InspectionType.FINISHED_GOODS)
                && supplierId == null;

        if (includeIncoming) {
            List<IncomingInspection> incoming = incomingInspectionRepository.findAll(
                    buildIncomingSpec(orgId, from, to, itemId, warehouseId, supplierId));
            for (IncomingInspection i : incoming) {
                if (i.getRejectedQuantity() == null || i.getRejectedQuantity().compareTo(BigDecimal.ZERO) <= 0) {
                    continue;
                }
                rows.add(mapIncoming(i));
            }
        }

        if (includeFinished) {
            List<FinishedGoodsInspection> finished = finishedGoodsInspectionRepository.findAll(
                    buildFinishedSpec(orgId, from, to, itemId, warehouseId, productionOrderId));
            for (FinishedGoodsInspection i : finished) {
                if (i.getRejectedQuantity() == null || i.getRejectedQuantity().compareTo(BigDecimal.ZERO) <= 0) {
                    continue;
                }
                rows.add(mapFinished(i));
            }
        }

        rows.sort(Comparator
                .comparing(RejectionReportRowResponse::completionDate,
                        Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(RejectionReportRowResponse::inspectionNumber,
                        Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER).reversed())
                .thenComparing(RejectionReportRowResponse::id, Comparator.reverseOrder()));
        return rows;
    }

    private Specification<IncomingInspection> buildIncomingSpec(
            Long orgId,
            LocalDate from,
            LocalDate to,
            Long itemId,
            Long warehouseId,
            Long supplierId) {
        return (root, query, cb) -> {
            if (query != null && !Long.class.equals(query.getResultType()) && !long.class.equals(query.getResultType())) {
                root.fetch("item", JoinType.LEFT);
                root.fetch("warehouse", JoinType.LEFT);
                root.fetch("supplier", JoinType.LEFT);
                root.fetch("goodsReceipt", JoinType.LEFT);
                root.fetch("inspectedBy", JoinType.LEFT);
                root.fetch("parameters", JoinType.LEFT);
                query.distinct(true);
            }
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("organization").get("id"), orgId));
            predicates.add(cb.equal(root.get("status"), IncomingInspectionStatus.COMPLETED));
            predicates.add(cb.greaterThan(root.get("rejectedQuantity"), BigDecimal.ZERO));
            if (from != null) predicates.add(cb.greaterThanOrEqualTo(root.get("inspectionDate"), from));
            if (to != null) predicates.add(cb.lessThanOrEqualTo(root.get("inspectionDate"), to));
            if (itemId != null) predicates.add(cb.equal(root.get("item").get("id"), itemId));
            if (warehouseId != null) predicates.add(cb.equal(root.get("warehouse").get("id"), warehouseId));
            if (supplierId != null) predicates.add(cb.equal(root.get("supplier").get("id"), supplierId));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Specification<FinishedGoodsInspection> buildFinishedSpec(
            Long orgId,
            LocalDate from,
            LocalDate to,
            Long itemId,
            Long warehouseId,
            Long productionOrderId) {
        return (root, query, cb) -> {
            if (query != null && !Long.class.equals(query.getResultType()) && !long.class.equals(query.getResultType())) {
                root.fetch("item", JoinType.LEFT);
                root.fetch("warehouse", JoinType.LEFT);
                root.fetch("productionOrder", JoinType.LEFT);
                root.fetch("productionReceipt", JoinType.LEFT);
                root.fetch("inspectedBy", JoinType.LEFT);
                root.fetch("parameters", JoinType.LEFT);
                query.distinct(true);
            }
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("organization").get("id"), orgId));
            predicates.add(cb.equal(root.get("status"), FinishedGoodsInspectionStatus.COMPLETED));
            predicates.add(cb.greaterThan(root.get("rejectedQuantity"), BigDecimal.ZERO));
            if (from != null) predicates.add(cb.greaterThanOrEqualTo(root.get("inspectionDate"), from));
            if (to != null) predicates.add(cb.lessThanOrEqualTo(root.get("inspectionDate"), to));
            if (itemId != null) predicates.add(cb.equal(root.get("item").get("id"), itemId));
            if (warehouseId != null) predicates.add(cb.equal(root.get("warehouse").get("id"), warehouseId));
            if (productionOrderId != null) {
                predicates.add(cb.equal(root.get("productionOrder").get("id"), productionOrderId));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private RejectionReportRowResponse mapIncoming(IncomingInspection i) {
        BigDecimal inspected = nz(i.getReceivedQuantity());
        BigDecimal rejected = nz(i.getRejectedQuantity());
        List<String> failed = i.getParameters().stream()
                .filter(p -> p.getResult() == InspectionParameterResult.FAIL)
                .sorted(Comparator.comparingInt(p -> p.getSortOrder()))
                .map(p -> p.getParameterName())
                .collect(Collectors.toList());
        return new RejectionReportRowResponse(
                i.getId(),
                InspectionType.INCOMING,
                i.getInspectionNumber(),
                i.getInspectionDate(),
                i.getItem().getId(),
                i.getItem().getItemCode(),
                i.getItem().getName(),
                i.getWarehouse().getId(),
                i.getWarehouse().getName(),
                i.getSupplier() != null ? i.getSupplier().getId() : null,
                i.getSupplier() != null ? i.getSupplier().getName() : null,
                null,
                null,
                i.getGoodsReceipt() != null ? i.getGoodsReceipt().getGrnNumber() : null,
                inspected,
                nz(i.getAcceptedQuantity()),
                rejected,
                i.getUnitOfMeasure(),
                rate(rejected, inspected),
                i.getRemarks(),
                failed,
                i.getInspectedBy() != null ? i.getInspectedBy().getFullName() : null
        );
    }

    private RejectionReportRowResponse mapFinished(FinishedGoodsInspection i) {
        BigDecimal inspected = nz(i.getReceivedQuantity());
        BigDecimal rejected = nz(i.getRejectedQuantity());
        List<String> failed = i.getParameters().stream()
                .filter(p -> p.getResult() == InspectionParameterResult.FAIL)
                .sorted(Comparator.comparingInt(p -> p.getSortOrder()))
                .map(p -> p.getParameterName())
                .collect(Collectors.toList());
        return new RejectionReportRowResponse(
                i.getId(),
                InspectionType.FINISHED_GOODS,
                i.getInspectionNumber(),
                i.getInspectionDate(),
                i.getItem().getId(),
                i.getItem().getItemCode(),
                i.getItem().getName(),
                i.getWarehouse().getId(),
                i.getWarehouse().getName(),
                null,
                null,
                i.getProductionOrder() != null ? i.getProductionOrder().getId() : null,
                i.getProductionOrder() != null ? i.getProductionOrder().getOrderNumber() : null,
                i.getProductionReceipt() != null ? i.getProductionReceipt().getReceiptNumber() : null,
                inspected,
                nz(i.getAcceptedQuantity()),
                rejected,
                i.getUnitOfMeasure(),
                rate(rejected, inspected),
                i.getRemarks(),
                failed,
                i.getInspectedBy() != null ? i.getInspectedBy().getFullName() : null
        );
    }

    private RejectionReportTotalsResponse computeSummary(List<RejectionReportRowResponse> rows) {
        Set<Long> items = new LinkedHashSet<>();
        long incoming = 0;
        long finished = 0;
        for (RejectionReportRowResponse row : rows) {
            items.add(row.itemId());
            if (row.inspectionType() == InspectionType.INCOMING) incoming++;
            else finished++;
        }
        return new RejectionReportTotalsResponse(rows.size(), items.size(), incoming, finished);
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

    private static String csvCell(String value) {
        if (value == null) return "";
        String escaped = value.replace("\"", "\"\"");
        if (escaped.contains(",") || escaped.contains("\"") || escaped.contains("\n")) {
            return "\"" + escaped + "\"";
        }
        return escaped;
    }
}
