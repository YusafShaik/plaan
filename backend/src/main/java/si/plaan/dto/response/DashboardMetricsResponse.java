package si.plaan.dto.response;

import java.math.BigDecimal;

public record DashboardMetricsResponse(
        BigDecimal salesInvoiced,
        BigDecimal purchasesInvoiced,
        BigDecimal customerOutstanding,
        BigDecimal supplierOutstanding
) {}
