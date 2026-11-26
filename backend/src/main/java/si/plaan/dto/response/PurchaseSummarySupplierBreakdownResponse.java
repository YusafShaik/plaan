package si.plaan.dto.response;

import java.math.BigDecimal;

public record PurchaseSummarySupplierBreakdownResponse(
    Long supplierId,
    String supplierName,
    BigDecimal orderValue
) {}
