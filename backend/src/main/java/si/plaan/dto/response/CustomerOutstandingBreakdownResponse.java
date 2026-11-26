package si.plaan.dto.response;

import java.math.BigDecimal;

public record CustomerOutstandingBreakdownResponse(
    Long customerId,
    String customerName,
    BigDecimal outstandingAmount
) {}
