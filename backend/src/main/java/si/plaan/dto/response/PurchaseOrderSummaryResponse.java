package si.plaan.dto.response;

import java.math.BigDecimal;

public record PurchaseOrderSummaryResponse(
    long totalOrders,
    long draftCount,
    long issuedCount,
    long partiallyReceivedCount,
    long completedCount,
    long cancelledCount,
    BigDecimal totalValue
) {}
