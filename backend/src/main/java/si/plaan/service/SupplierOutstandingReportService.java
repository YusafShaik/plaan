package si.plaan.service;

import org.springframework.data.domain.Pageable;
import si.plaan.dto.response.SupplierOutstandingReportResponse;
import si.plaan.entity.DeliveryScheduleStatus;
import si.plaan.entity.InvoicePaymentStatus;

import java.time.LocalDate;

public interface SupplierOutstandingReportService {

    SupplierOutstandingReportResponse getReport(
            Long orgId,
            Long supplierId,
            LocalDate invoiceFrom,
            LocalDate invoiceTo,
            LocalDate dueFrom,
            LocalDate dueTo,
            InvoicePaymentStatus paymentStatus,
            DeliveryScheduleStatus dueStatus,
            Pageable pageable);

    byte[] exportCsv(
            Long orgId,
            Long supplierId,
            LocalDate invoiceFrom,
            LocalDate invoiceTo,
            LocalDate dueFrom,
            LocalDate dueTo,
            InvoicePaymentStatus paymentStatus,
            DeliveryScheduleStatus dueStatus);
}
