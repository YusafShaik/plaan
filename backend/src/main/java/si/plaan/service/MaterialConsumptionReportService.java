package si.plaan.service;

import org.springframework.data.domain.Pageable;
import si.plaan.dto.response.MaterialConsumptionReportResponse;
import si.plaan.entity.ProductionOrderStatus;

import java.time.LocalDate;

public interface MaterialConsumptionReportService {

    MaterialConsumptionReportResponse getReport(
            Long orgId,
            LocalDate fromDate,
            LocalDate toDate,
            Long productionOrderId,
            Long productId,
            Long materialId,
            Long sourceWarehouseId,
            ProductionOrderStatus status,
            Boolean unreconciledOnly,
            Pageable pageable);

    byte[] exportCsv(
            Long orgId,
            LocalDate fromDate,
            LocalDate toDate,
            Long productionOrderId,
            Long productId,
            Long materialId,
            Long sourceWarehouseId,
            ProductionOrderStatus status,
            Boolean unreconciledOnly);
}
