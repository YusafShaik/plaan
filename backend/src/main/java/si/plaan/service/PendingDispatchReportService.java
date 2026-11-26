package si.plaan.service;

import org.springframework.data.domain.Pageable;
import si.plaan.dto.response.PendingDispatchReportResponse;
import si.plaan.entity.DeliveryScheduleStatus;

import java.time.LocalDate;

public interface PendingDispatchReportService {

    PendingDispatchReportResponse getReport(
            Long orgId,
            Long customerId,
            Long itemId,
            Long warehouseId,
            DeliveryScheduleStatus deliveryStatus,
            LocalDate expectedFrom,
            LocalDate expectedTo,
            String stockAvailability,
            Pageable pageable);

    byte[] exportCsv(
            Long orgId,
            Long customerId,
            Long itemId,
            Long warehouseId,
            DeliveryScheduleStatus deliveryStatus,
            LocalDate expectedFrom,
            LocalDate expectedTo,
            String stockAvailability);
}
