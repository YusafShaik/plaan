package si.plaan.dto.response;

import java.math.BigDecimal;

public record ExpenseReportTotalsResponse(
    BigDecimal totalExpenses,
    long expenseTransactions
) {}
