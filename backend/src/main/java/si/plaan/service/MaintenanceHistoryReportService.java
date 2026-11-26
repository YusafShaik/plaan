package si.plaan.service;

import org.springframework.data.domain.Pageable;
import si.plaan.dto.response.MaintenanceHistoryReportResponse;
import si.plaan.entity.MaintenanceWorkOrderType;

import java.time.LocalDate;

public interface MaintenanceHistoryReportService {

    MaintenanceHistoryReportResponse getReport(
            Long orgId,
            LocalDate fromDate,
            LocalDate toDate,
            Long equipmentId,
            MaintenanceWorkOrderType maintenanceType,
            String technician,
            Boolean machineOperational,
            Pageable pageable);

    byte[] exportCsv(
            Long orgId,
            LocalDate fromDate,
            LocalDate toDate,
            Long equipmentId,
            MaintenanceWorkOrderType maintenanceType,
            String technician,
            Boolean machineOperational);
}
