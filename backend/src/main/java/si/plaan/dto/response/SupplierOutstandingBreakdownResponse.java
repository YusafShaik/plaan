package si.plaan.dto.response;

import java.math.BigDecimal;

public record SupplierOutstandingBreakdownResponse(
    Long supplierId,
    String supplierName,
    BigDecimal outstandingAmount
) {}
