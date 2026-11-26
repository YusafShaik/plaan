package si.plaan.dto.response;

import java.math.BigDecimal;

public record StockMovementsSummaryResponse(
    boolean focused,
    BigDecimal openingBalance,
    BigDecimal totalIncoming,
    BigDecimal totalOutgoing,
    BigDecimal closingBalance,
    long movementCount,
    long incomingCount,
    long outgoingCount,
    String unitOfMeasure
) {}
