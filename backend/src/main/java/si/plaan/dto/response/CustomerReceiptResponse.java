package si.plaan.dto.response;

import si.plaan.entity.CustomerReceiptStatus;
import si.plaan.entity.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record CustomerReceiptResponse(
    Long id,
    String receiptNumber,
    LocalDate receiptDate,
    Long salesInvoiceId,
    String invoiceNumber,
    Long customerId,
    String customerCode,
    String customerName,
    BigDecimal invoiceTotal,
    BigDecimal previouslyReceived,
    BigDecimal outstandingAmount,
    BigDecimal amount,
    PaymentMethod paymentMethod,
    String paymentReference,
    String notes,
    CustomerReceiptStatus status,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
