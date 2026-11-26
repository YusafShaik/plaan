package si.plaan.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import si.plaan.entity.PaymentMethod;
import si.plaan.entity.SupplierPaymentStatus;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CreateSupplierPaymentRequest(
    String paymentNumber,
    @NotNull(message = "Payment date is required")
    LocalDate paymentDate,
    @NotNull(message = "Purchase invoice ID is required")
    Long purchaseInvoiceId,
    @NotNull(message = "Payment amount is required")
    @DecimalMin(value = "0.01", message = "Payment amount must be greater than zero")
    BigDecimal amount,
    @NotNull(message = "Payment method is required")
    PaymentMethod paymentMethod,
    String paymentReference,
    String notes,
    SupplierPaymentStatus status
) {}
