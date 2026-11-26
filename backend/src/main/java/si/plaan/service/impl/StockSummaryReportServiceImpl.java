package si.plaan.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.response.PageResponse;
import si.plaan.dto.response.StockOverviewItemResponse;
import si.plaan.dto.response.StockSummaryReportResponse;
import si.plaan.dto.response.StockSummaryTotalsResponse;
import si.plaan.service.InventoryService;
import si.plaan.service.StockSummaryReportService;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class StockSummaryReportServiceImpl implements StockSummaryReportService {

    private final InventoryService inventoryService;

    @Override
    @Transactional(readOnly = true)
    public StockSummaryReportResponse getReport(
            Long orgId,
            String search,
            Long warehouseId,
            Long itemTypeId,
            String stockStatus,
            Pageable pageable) {
        requireOrg(orgId);
        List<StockOverviewItemResponse> all = inventoryService.listStockOverview(
                orgId, search, warehouseId, itemTypeId, stockStatus);

        StockSummaryTotalsResponse summary = computeSummary(all);

        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), all.size());
        List<StockOverviewItemResponse> pageContent =
                start >= all.size() ? List.of() : all.subList(start, end);

        return new StockSummaryReportResponse(
                summary,
                PageResponse.from(new PageImpl<>(pageContent, pageable, all.size()))
        );
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportCsv(
            Long orgId,
            String search,
            Long warehouseId,
            Long itemTypeId,
            String stockStatus) {
        requireOrg(orgId);
        List<StockOverviewItemResponse> rows = inventoryService.listStockOverview(
                orgId, search, warehouseId, itemTypeId, stockStatus);

        StringBuilder csv = new StringBuilder();
        csv.append("Item Code,Item Name,Item Type,Warehouse,UOM,On Hand,Pending QC,Rejected,Available\n");
        for (StockOverviewItemResponse row : rows) {
            csv.append(csvCell(row.itemCode())).append(',')
                    .append(csvCell(row.itemName())).append(',')
                    .append(csvCell(row.itemTypeName())).append(',')
                    .append(csvCell(row.warehouseName())).append(',')
                    .append(csvCell(row.unitOfMeasure())).append(',')
                    .append(qty(row.onHandQuantity())).append(',')
                    .append(qty(row.pendingInspectionQuantity())).append(',')
                    .append(qty(row.rejectedQuantity())).append(',')
                    .append(qty(row.availableQuantity()))
                    .append('\n');
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private StockSummaryTotalsResponse computeSummary(List<StockOverviewItemResponse> rows) {
        Set<Long> inStock = new HashSet<>();
        Set<Long> noAvailable = new HashSet<>();
        Set<Long> pendingQc = new HashSet<>();
        Set<Long> rejections = new HashSet<>();

        for (StockOverviewItemResponse row : rows) {
            if (positive(row.onHandQuantity())) {
                inStock.add(row.itemId());
            }
            if (!positive(row.availableQuantity())) {
                noAvailable.add(row.itemId());
            }
            if (positive(row.pendingInspectionQuantity())) {
                pendingQc.add(row.itemId());
            }
            if (positive(row.rejectedQuantity())) {
                rejections.add(row.itemId());
            }
        }

        return new StockSummaryTotalsResponse(
                inStock.size(),
                noAvailable.size(),
                pendingQc.size(),
                rejections.size()
        );
    }

    private static boolean positive(BigDecimal value) {
        return value != null && value.compareTo(BigDecimal.ZERO) > 0;
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

    private void requireOrg(Long orgId) {
        if (orgId == null) throw new AccessDeniedException("Organization context required");
    }
}
