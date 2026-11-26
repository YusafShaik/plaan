package si.plaan.dto.response;

import java.math.BigDecimal;

public record ExpenseReportCategoryBreakdownResponse(
    Long categoryId,
    String categoryName,
    BigDecimal amount,
    BigDecimal percentage
) {}
