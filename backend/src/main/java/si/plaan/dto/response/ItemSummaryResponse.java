package si.plaan.dto.response;

public record ItemSummaryResponse(
    long totalItems,
    long activeItems,
    long inactiveItems
) {}
