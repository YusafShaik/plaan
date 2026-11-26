package si.plaan.service;

import org.springframework.data.domain.Pageable;
import si.plaan.dto.response.StockMovementsReportResponse;

import java.time.LocalDate;

public interface StockMovementsReportService {

    StockMovementsReportResponse getReport(
            Long orgId,
            LocalDate fromDate,
            LocalDate toDate,
            Long itemId,
            Long warehouseId,
            String movementType,
            String reference,
            Pageable pageable);

    byte[] exportCsv(
            Long orgId,
            LocalDate fromDate,
            LocalDate toDate,
            Long itemId,
            Long warehouseId,
            String movementType,
            String reference);
}
