package si.plaan.dto.response;

import si.plaan.entity.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ExpenseReportRowResponse(
    Long expenseId,
    String expenseNumber,
    LocalDate expenseDate,
    Long categoryId,
    String categoryName,
    String description,
    String paidTo,
    PaymentMethod paymentMethod,
    String paymentReference,
    BigDecimal amount
) {}
