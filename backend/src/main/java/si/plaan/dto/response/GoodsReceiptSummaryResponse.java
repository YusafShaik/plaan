package si.plaan.dto.response;

public record GoodsReceiptSummaryResponse(
    long totalGrns,
    long draftCount,
    long postedCount,
    long totalItemsReceived
) {}
