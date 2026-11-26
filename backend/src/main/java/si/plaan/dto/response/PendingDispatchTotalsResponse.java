package si.plaan.dto.response;

import java.math.BigDecimal;

public record PendingDispatchTotalsResponse(
    long pendingSalesOrders,
    long overdueOrders,
    BigDecimal pendingOrderValue,
    long linesWithStockShortage
) {}
