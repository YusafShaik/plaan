package si.plaan.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.response.PageResponse;
import si.plaan.dto.response.StockMovementsReportResponse;
import si.plaan.dto.response.StockMovementsRowResponse;
import si.plaan.dto.response.StockMovementsSummaryResponse;
import si.plaan.entity.StockMovement;
import si.plaan.repository.StockMovementRepository;
import si.plaan.service.StockMovementsReportService;
import si.plaan.service.support.StockMovementSupport;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class StockMovementsReportServiceImpl implements StockMovementsReportService {

    private final StockMovementRepository stockMovementRepository;

    @Override
    @Transactional(readOnly = true)
    public StockMovementsReportResponse getReport(
            Long orgId,
            LocalDate fromDate,
            LocalDate toDate,
            Long itemId,
            Long warehouseId,
            String movementType,
            String reference,
            Pageable pageable) {
        requireOrg(orgId);
        DateRange range = normalizeRange(fromDate, toDate);
        BuiltReport built = build(orgId, range.from(), range.to(), itemId, warehouseId, movementType, reference);

        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), built.rows().size());
        List<StockMovementsRowResponse> pageContent =
                start >= built.rows().size() ? List.of() : built.rows().subList(start, end);

        return new StockMovementsReportResponse(
                built.summary(),
                PageResponse.from(new PageImpl<>(pageContent, pageable, built.rows().size()))
        );
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportCsv(
            Long orgId,
            LocalDate fromDate,
            LocalDate toDate,
            Long itemId,
            Long warehouseId,
            String movementType,
            String reference) {
        requireOrg(orgId);
        DateRange range = normalizeRange(fromDate, toDate);
        BuiltReport built = build(orgId, range.from(), range.to(), itemId, warehouseId, movementType, reference);

        StringBuilder csv = new StringBuilder();
        csv.append("Date,Item Code,Item Name,Warehouse,Movement Type,Reference,Incoming,Outgoing,Running Balance,UOM\n");
        for (StockMovementsRowResponse row : built.rows()) {
            if (row.openingBalanceRow()) continue;
            csv.append(row.movementDate()).append(',')
                    .append(csvCell(row.itemCode())).append(',')
                    .append(csvCell(row.itemName())).append(',')
                    .append(csvCell(row.warehouseName())).append(',')
                    .append(csvCell(row.movementTypeLabel())).append(',')
                    .append(csvCell(row.referenceNumber())).append(',')
                    .append(qty(row.quantityIn())).append(',')
                    .append(qty(row.quantityOut())).append(',')
                    .append(qty(row.runningBalance())).append(',')
                    .append(csvCell(row.unitOfMeasure()))
                    .append('\n');
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private BuiltReport build(
            Long orgId,
            LocalDate from,
            LocalDate to,
            Long itemId,
            Long warehouseId,
            String movementType,
            String reference) {
        List<StockMovement> all = stockMovementRepository.findStockLedgerMovements(orgId, itemId, warehouseId);

        Map<String, List<StockMovement>> byBucket = new LinkedHashMap<>();
        for (StockMovement sm : all) {
            String key = sm.getItem().getId() + ":" + sm.getWarehouse().getId();
            byBucket.computeIfAbsent(key, ignored -> new ArrayList<>()).add(sm);
        }

        boolean focused = itemId != null && warehouseId != null;
        List<StockMovementsRowResponse> displayRows = new ArrayList<>();
        BigDecimal opening = BigDecimal.ZERO;
        BigDecimal periodIn = BigDecimal.ZERO;
        BigDecimal periodOut = BigDecimal.ZERO;
        BigDecimal closing = BigDecimal.ZERO;
        String uom = null;
        long incomingCount = 0;
        long outgoingCount = 0;

        String refFilter = reference != null ? reference.trim().toLowerCase(Locale.ROOT) : null;

        for (List<StockMovement> bucket : byBucket.values()) {
            bucket.sort(Comparator
                    .comparing(StockMovement::getMovementDate)
                    .thenComparing(StockMovement::getId));

            BigDecimal balance = BigDecimal.ZERO;
            BigDecimal bucketOpening = BigDecimal.ZERO;
            boolean openingCaptured = false;

            for (StockMovement sm : bucket) {
                boolean isIn = StockMovementSupport.isIncoming(sm.getMovementType());
                if (!openingCaptured && !sm.getMovementDate().isBefore(from)) {
                    bucketOpening = balance;
                    openingCaptured = true;
                }

                if (isIn) {
                    balance = balance.add(sm.getQuantity());
                } else {
                    balance = balance.subtract(sm.getQuantity());
                }

                boolean inPeriod = !sm.getMovementDate().isBefore(from) && !sm.getMovementDate().isAfter(to);
                if (!inPeriod) continue;

                if (isIn) {
                    periodIn = periodIn.add(sm.getQuantity());
                } else {
                    periodOut = periodOut.add(sm.getQuantity());
                }

                boolean matchesType = StockMovementSupport.matchesFilter(sm.getMovementType(), movementType);
                boolean matchesRef = refFilter == null || refFilter.isEmpty()
                        || (sm.getReferenceNumber() != null
                        && sm.getReferenceNumber().toLowerCase(Locale.ROOT).contains(refFilter));
                if (!matchesType || !matchesRef) continue;

                if (isIn) incomingCount++;
                else outgoingCount++;
                if (uom == null) uom = sm.getUnitOfMeasure();

                displayRows.add(toRow(sm, isIn, balance, false));
            }

            if (!openingCaptured) {
                bucketOpening = balance;
            }
            opening = opening.add(bucketOpening);
            closing = closing.add(balance);
        }

        if (focused && !byBucket.isEmpty()) {
            // Prefer opening/closing for the single selected bucket (already one bucket when focused)
            displayRows.add(0, syntheticOpeningRow(byBucket.values().iterator().next(), from, opening, uom));
        }

        // Sort display chronologically across buckets (keep synthetic opening first if present)
        List<StockMovementsRowResponse> openingRows = displayRows.stream()
                .filter(StockMovementsRowResponse::openingBalanceRow)
                .toList();
        List<StockMovementsRowResponse> movementRows = displayRows.stream()
                .filter(r -> !r.openingBalanceRow())
                .sorted(Comparator
                        .comparing(StockMovementsRowResponse::movementDate)
                        .thenComparing(StockMovementsRowResponse::id,
                                Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
        List<StockMovementsRowResponse> ordered = new ArrayList<>(openingRows);
        ordered.addAll(movementRows);

        StockMovementsSummaryResponse summary = new StockMovementsSummaryResponse(
                focused,
                opening,
                periodIn,
                periodOut,
                closing,
                movementRows.size(),
                incomingCount,
                outgoingCount,
                uom
        );
        return new BuiltReport(summary, ordered);
    }

    private StockMovementsRowResponse syntheticOpeningRow(
            List<StockMovement> bucket, LocalDate asOfDate, BigDecimal openingBalance, String uom) {
        StockMovement sample = bucket.get(0);
        return new StockMovementsRowResponse(
                null,
                asOfDate,
                sample.getItem().getId(),
                sample.getItem().getItemCode(),
                sample.getItem().getName(),
                sample.getWarehouse().getId(),
                sample.getWarehouse().getWarehouseCode(),
                sample.getWarehouse().getName(),
                "OPENING_BALANCE",
                "Opening Balance",
                null,
                null, null, null, null, null, null, null, null,
                null,
                null,
                openingBalance,
                uom != null ? uom : sample.getUnitOfMeasure(),
                true
        );
    }

    private StockMovementsRowResponse toRow(StockMovement sm, boolean isIn, BigDecimal balance, boolean opening) {
        return new StockMovementsRowResponse(
                sm.getId(),
                sm.getMovementDate(),
                sm.getItem().getId(),
                sm.getItem().getItemCode(),
                sm.getItem().getName(),
                sm.getWarehouse().getId(),
                sm.getWarehouse().getWarehouseCode(),
                sm.getWarehouse().getName(),
                sm.getMovementType(),
                StockMovementSupport.displayLabel(sm.getMovementType()),
                sm.getReferenceNumber(),
                sm.getGoodsReceipt() != null ? sm.getGoodsReceipt().getId() : null,
                sm.getOpeningStock() != null ? sm.getOpeningStock().getId() : null,
                sm.getStockTransfer() != null ? sm.getStockTransfer().getId() : null,
                sm.getStockAdjustment() != null ? sm.getStockAdjustment().getId() : null,
                sm.getMaterialIssue() != null ? sm.getMaterialIssue().getId() : null,
                sm.getMaterialReturn() != null ? sm.getMaterialReturn().getId() : null,
                sm.getProductionReceipt() != null ? sm.getProductionReceipt().getId() : null,
                sm.getDispatchOrder() != null ? sm.getDispatchOrder().getId() : null,
                isIn ? sm.getQuantity() : null,
                !isIn ? sm.getQuantity() : null,
                balance,
                sm.getUnitOfMeasure(),
                opening
        );
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

    private record DateRange(LocalDate from, LocalDate to) {}

    private record BuiltReport(
            StockMovementsSummaryResponse summary,
            List<StockMovementsRowResponse> rows
    ) {}
}
