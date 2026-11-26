package si.plaan.dto.response;

import si.plaan.entity.DeliveryScheduleStatus;
import si.plaan.entity.InvoicePaymentStatus;

import java.math.BigDecimal;
import java.time.LocalDate;

public record SupplierOutstandingRowResponse(
    Long purchaseInvoiceId,
    String invoiceNumber,
    String supplierInvoiceNumber,
    LocalDate invoiceDate,
    Long supplierId,
    String supplierName,
    BigDecimal invoiceAmount,
    BigDecimal paidAmount,
    BigDecimal outstandingAmount,
    LocalDate dueDate,
    Integer daysOverdue,
    InvoicePaymentStatus paymentStatus,
    DeliveryScheduleStatus dueStatus
) {}
