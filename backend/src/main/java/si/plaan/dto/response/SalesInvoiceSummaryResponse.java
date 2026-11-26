package si.plaan.dto.response;

import java.math.BigDecimal;

public record SalesInvoiceSummaryResponse(
    long totalInvoices,
    long draftCount,
    long postedCount,
    BigDecimal totalReceivable,
    BigDecimal outstandingReceivable
) {}
