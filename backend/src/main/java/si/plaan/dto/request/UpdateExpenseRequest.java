package si.plaan.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import si.plaan.entity.ExpenseStatus;
import si.plaan.entity.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDate;

public record UpdateExpenseRequest(
    @NotNull(message = "Expense date is required")
    LocalDate expenseDate,
    @NotNull(message = "Expense category is required")
    Long categoryId,
    @NotBlank(message = "Description is required")
    String description,
    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
    BigDecimal amount,
    @NotNull(message = "Payment method is required")
    PaymentMethod paymentMethod,
    String paidTo,
    String paymentReference,
    String attachmentFileName,
    String attachmentContentType,
    String attachmentData,
    String notes,
    ExpenseStatus status
) {}
