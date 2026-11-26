package si.plaan.service;

import org.springframework.data.domain.Pageable;
import si.plaan.dto.response.InspectionSummaryReportResponse;
import si.plaan.entity.InspectionType;

import java.time.LocalDate;

public interface InspectionSummaryReportService {

    InspectionSummaryReportResponse getReport(
            Long orgId,
            LocalDate fromDate,
            LocalDate toDate,
            InspectionType inspectionType,
            Long itemId,
            Long warehouseId,
            String status,
            Pageable pageable);

    byte[] exportCsv(
            Long orgId,
            LocalDate fromDate,
            LocalDate toDate,
            InspectionType inspectionType,
            Long itemId,
            Long warehouseId,
            String status);
}
