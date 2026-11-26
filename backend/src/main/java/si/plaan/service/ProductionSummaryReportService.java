package si.plaan.service;

import org.springframework.data.domain.Pageable;
import si.plaan.dto.response.ProductionSummaryReportResponse;
import si.plaan.entity.ProductionOrderStatus;

import java.time.LocalDate;

public interface ProductionSummaryReportService {

    ProductionSummaryReportResponse getReport(
            Long orgId,
            LocalDate fromDate,
            LocalDate toDate,
            Long productId,
            Long sourceWarehouseId,
            Long finishedGoodsWarehouseId,
            ProductionOrderStatus status,
            Pageable pageable);

    byte[] exportCsv(
            Long orgId,
            LocalDate fromDate,
            LocalDate toDate,
            Long productId,
            Long sourceWarehouseId,
            Long finishedGoodsWarehouseId,
            ProductionOrderStatus status);
}
