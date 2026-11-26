package si.plaan.dto.response;

import java.math.BigDecimal;

public record ExpenseCategoryTotalResponse(
    String categoryName,
    BigDecimal amount
) {}
