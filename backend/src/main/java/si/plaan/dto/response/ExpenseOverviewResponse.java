package si.plaan.dto.response;

import java.math.BigDecimal;
import java.util.List;

public record ExpenseOverviewResponse(
    BigDecimal totalPostedThisMonth,
    List<ExpenseCategoryTotalResponse> byCategory
) {}
