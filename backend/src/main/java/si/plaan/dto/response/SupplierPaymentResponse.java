package si.plaan.dto.response;

import si.plaan.entity.PaymentMethod;
import si.plaan.entity.SupplierPaymentStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record SupplierPaymentResponse(
    Long id,
    String paymentNumber,
    LocalDate paymentDate,
    Long purchaseInvoiceId,
    String invoiceNumber,
    Long supplierId,
    String supplierCode,
    String supplierName,
    BigDecimal invoiceTotal,
    BigDecimal previouslyPaid,
    BigDecimal outstandingAmount,
    BigDecimal amount,
    PaymentMethod paymentMethod,
    String paymentReference,
    String notes,
    SupplierPaymentStatus status,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
