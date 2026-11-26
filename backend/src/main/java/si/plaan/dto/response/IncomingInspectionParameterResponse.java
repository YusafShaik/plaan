package si.plaan.dto.response;

import si.plaan.entity.InspectionParameterResult;

public record IncomingInspectionParameterResponse(
    Long id,
    String parameterName,
    String acceptanceCriteria,
    InspectionParameterResult result,
    int sortOrder
) {}
