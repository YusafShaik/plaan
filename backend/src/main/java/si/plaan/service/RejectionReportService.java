package si.plaan.service;

import org.springframework.data.domain.Pageable;
import si.plaan.dto.response.RejectionReportResponse;
import si.plaan.entity.InspectionType;

import java.time.LocalDate;

public interface RejectionReportService {

    RejectionReportResponse getReport(
            Long orgId,
            LocalDate fromDate,
            LocalDate toDate,
            InspectionType inspectionType,
            Long itemId,
            Long warehouseId,
            Long supplierId,
            Long productionOrderId,
            Pageable pageable);

    byte[] exportCsv(
            Long orgId,
            LocalDate fromDate,
            LocalDate toDate,
            InspectionType inspectionType,
            Long itemId,
            Long warehouseId,
            Long supplierId,
            Long productionOrderId);
}
