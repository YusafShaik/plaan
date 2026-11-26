package si.plaan.service;

import org.springframework.data.domain.Pageable;
import si.plaan.dto.response.StockSummaryReportResponse;

public interface StockSummaryReportService {

    StockSummaryReportResponse getReport(
            Long orgId,
            String search,
            Long warehouseId,
            Long itemTypeId,
            String stockStatus,
            Pageable pageable);

    byte[] exportCsv(
            Long orgId,
            String search,
            Long warehouseId,
            Long itemTypeId,
            String stockStatus);
}
