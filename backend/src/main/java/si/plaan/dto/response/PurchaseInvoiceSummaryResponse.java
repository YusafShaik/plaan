package si.plaan.dto.response;

import java.math.BigDecimal;

public record PurchaseInvoiceSummaryResponse(
    long totalInvoices,
    long draftCount,
    long postedCount,
    BigDecimal totalPayable,
    BigDecimal outstandingPayable
) {}
