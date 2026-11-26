package si.plaan.dto.response;

import java.math.BigDecimal;

public record PurchaseSummaryTotalsResponse(
    long totalPurchaseOrders,
    BigDecimal totalOrderValue,
    long fullyReceived,
    long pendingOrders
) {}
