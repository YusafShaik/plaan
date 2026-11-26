package si.plaan.dto.response;

import java.math.BigDecimal;

public record PendingPurchaseOrderTotalsResponse(
    long pendingPos,
    BigDecimal pendingValue,
    long overduePos
) {}
