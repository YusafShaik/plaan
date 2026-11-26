package si.plaan.dto.response;

public record InspectionSummaryTotalsResponse(
    long totalInspections,
    long completed,
    long awaitingCompletion,
    long inspectionsWithRejections
) {}
