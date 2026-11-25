package si.plaan.dto.response;

public record CustomerSummaryResponse(
    long totalCustomers,
    long activeCustomers,
    long inactiveCustomers
) {}
