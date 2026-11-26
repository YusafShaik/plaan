package si.plaan.dto.response;

import si.plaan.entity.ExpenseStatus;
import si.plaan.entity.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record ExpenseResponse(
    Long id,
    String expenseNumber,
    LocalDate expenseDate,
    Long categoryId,
    String categoryName,
    String description,
    BigDecimal amount,
    PaymentMethod paymentMethod,
    String paidTo,
    String paymentReference,
    String attachmentFileName,
    String attachmentContentType,
    boolean hasAttachment,
    String notes,
    ExpenseStatus status,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
