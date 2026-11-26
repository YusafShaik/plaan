package si.plaan.dto.response;

import java.math.BigDecimal;

public record DashboardTrendMonthResponse(
        String monthKey,
        String monthLabel,
        BigDecimal salesInvoiced,
        BigDecimal purchasesInvoiced
) {}
