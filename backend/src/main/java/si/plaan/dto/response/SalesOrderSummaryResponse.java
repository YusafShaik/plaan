package si.plaan.dto.response;

import java.math.BigDecimal;

public record SalesOrderSummaryResponse(
    long totalOrders,
    long draftOrders,
    long confirmedOrders,
    long cancelledOrders,
    BigDecimal totalValue
) {}
