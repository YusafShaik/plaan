package si.plaan.service;

import org.springframework.data.domain.Pageable;
import si.plaan.dto.response.PurchaseSummaryReportResponse;
import si.plaan.entity.PurchaseOrderStatus;

import java.time.LocalDate;

public interface PurchaseSummaryReportService {

    PurchaseSummaryReportResponse getReport(
            Long orgId,
            LocalDate fromDate,
            LocalDate toDate,
            Long supplierId,
            Long warehouseId,
            PurchaseOrderStatus status,
            Pageable pageable);

    byte[] exportCsv(
            Long orgId,
            LocalDate fromDate,
            LocalDate toDate,
            Long supplierId,
            Long warehouseId,
            PurchaseOrderStatus status);
}
