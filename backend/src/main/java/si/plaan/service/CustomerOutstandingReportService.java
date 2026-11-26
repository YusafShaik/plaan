package si.plaan.service;

import org.springframework.data.domain.Pageable;
import si.plaan.dto.response.CustomerOutstandingReportResponse;
import si.plaan.entity.DeliveryScheduleStatus;
import si.plaan.entity.InvoicePaymentStatus;

import java.time.LocalDate;

public interface CustomerOutstandingReportService {

    CustomerOutstandingReportResponse getReport(
            Long orgId,
            Long customerId,
            LocalDate invoiceFrom,
            LocalDate invoiceTo,
            LocalDate dueFrom,
            LocalDate dueTo,
            InvoicePaymentStatus paymentStatus,
            DeliveryScheduleStatus dueStatus,
            Pageable pageable);

    byte[] exportCsv(
            Long orgId,
            Long customerId,
            LocalDate invoiceFrom,
            LocalDate invoiceTo,
            LocalDate dueFrom,
            LocalDate dueTo,
            InvoicePaymentStatus paymentStatus,
            DeliveryScheduleStatus dueStatus);
}
