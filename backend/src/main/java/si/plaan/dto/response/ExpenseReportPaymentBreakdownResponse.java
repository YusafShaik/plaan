package si.plaan.dto.response;

import si.plaan.entity.PaymentMethod;

import java.math.BigDecimal;

public record ExpenseReportPaymentBreakdownResponse(
    PaymentMethod paymentMethod,
    BigDecimal amount,
    BigDecimal percentage
) {}
