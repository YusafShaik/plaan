package si.plaan.service;

import org.springframework.data.domain.Pageable;
import si.plaan.dto.response.PendingPurchaseOrderReportResponse;
import si.plaan.entity.DeliveryScheduleStatus;

import java.time.LocalDate;

public interface PendingPurchaseOrderReportService {

    PendingPurchaseOrderReportResponse getReport(
            Long orgId,
            Long supplierId,
            Long itemId,
            Long warehouseId,
            DeliveryScheduleStatus deliveryStatus,
            LocalDate expectedFrom,
            LocalDate expectedTo,
            Pageable pageable);

    byte[] exportCsv(
            Long orgId,
            Long supplierId,
            Long itemId,
            Long warehouseId,
            DeliveryScheduleStatus deliveryStatus,
            LocalDate expectedFrom,
            LocalDate expectedTo);
}
