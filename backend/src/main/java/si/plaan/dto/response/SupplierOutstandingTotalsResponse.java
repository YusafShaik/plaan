package si.plaan.dto.response;

import java.math.BigDecimal;

public record SupplierOutstandingTotalsResponse(
    BigDecimal totalOutstanding,
    BigDecimal overdueAmount,
    long outstandingInvoices,
    long suppliersToPay
) {}
