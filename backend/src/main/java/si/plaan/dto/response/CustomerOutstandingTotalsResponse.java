package si.plaan.dto.response;

import java.math.BigDecimal;

public record CustomerOutstandingTotalsResponse(
    BigDecimal totalReceivable,
    BigDecimal overdueAmount,
    long outstandingInvoices,
    long customersWithOutstanding
) {}
