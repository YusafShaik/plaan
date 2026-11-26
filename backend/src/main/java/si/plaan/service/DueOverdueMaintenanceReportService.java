package si.plaan.service;

import org.springframework.data.domain.Pageable;
import si.plaan.dto.response.DueOverdueMaintenanceReportResponse;
import si.plaan.entity.MaintenanceScheduleStatus;

import java.time.LocalDate;

public interface DueOverdueMaintenanceReportService {

    DueOverdueMaintenanceReportResponse getReport(
            Long orgId,
            Long equipmentId,
            MaintenanceScheduleStatus dueStatus,
            LocalDate nextDueFrom,
            LocalDate nextDueTo,
            String workOrderStatus,
            Pageable pageable);

    byte[] exportCsv(
            Long orgId,
            Long equipmentId,
            MaintenanceScheduleStatus dueStatus,
            LocalDate nextDueFrom,
            LocalDate nextDueTo,
            String workOrderStatus);
}
