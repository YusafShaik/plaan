package si.plaan.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import si.plaan.entity.CustomerReceiptStatus;
import si.plaan.entity.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDate;

public record UpdateCustomerReceiptRequest(
    @NotNull(message = "Receipt date is required")
    LocalDate receiptDate,
    @NotNull(message = "Receipt amount is required")
    @DecimalMin(value = "0.01", message = "Receipt amount must be greater than zero")
    BigDecimal amount,
    @NotNull(message = "Payment method is required")
    PaymentMethod paymentMethod,
    String paymentReference,
    String notes,
    CustomerReceiptStatus status
) {}
