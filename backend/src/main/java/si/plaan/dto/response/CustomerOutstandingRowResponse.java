package si.plaan.dto.response;

import si.plaan.entity.DeliveryScheduleStatus;
import si.plaan.entity.InvoicePaymentStatus;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CustomerOutstandingRowResponse(
    Long salesInvoiceId,
    String invoiceNumber,
    LocalDate invoiceDate,
    Long customerId,
    String customerName,
    BigDecimal invoiceAmount,
    BigDecimal receivedAmount,
    BigDecimal outstandingAmount,
    LocalDate dueDate,
    Integer daysOverdue,
    InvoicePaymentStatus paymentStatus,
    DeliveryScheduleStatus dueStatus
) {}
