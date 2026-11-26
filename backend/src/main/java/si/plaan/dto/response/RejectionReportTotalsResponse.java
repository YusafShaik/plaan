package si.plaan.dto.response;

public record RejectionReportTotalsResponse(
    long inspectionsWithRejections,
    long affectedItems,
    long incomingRejections,
    long finishedGoodsRejections
) {}
