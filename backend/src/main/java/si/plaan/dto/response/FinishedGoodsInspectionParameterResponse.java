package si.plaan.dto.response;

import si.plaan.entity.InspectionParameterResult;

public record FinishedGoodsInspectionParameterResponse(
    Long id,
    String parameterName,
    String acceptanceCriteria,
    InspectionParameterResult result,
    int sortOrder
) {}
