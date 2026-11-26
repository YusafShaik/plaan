package si.plaan.service;

import org.springframework.data.domain.Pageable;
import si.plaan.dto.response.EquipmentDowntimeReportResponse;

import java.time.LocalDate;

public interface EquipmentDowntimeReportService {

    EquipmentDowntimeReportResponse getReport(
            Long orgId,
            LocalDate fromDate,
            LocalDate toDate,
            Long equipmentId,
            String restorationStatus,
            Pageable pageable);

    byte[] exportCsv(
            Long orgId,
            LocalDate fromDate,
            LocalDate toDate,
            Long equipmentId,
            String restorationStatus);
}
