package si.plaan.dto.response;

public record InspectionTemplateParameterResponse(
    Long id,
    String parameterName,
    String acceptanceCriteria,
    int sortOrder
) {}
