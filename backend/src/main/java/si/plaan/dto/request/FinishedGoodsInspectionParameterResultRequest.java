package si.plaan.dto.request;

import jakarta.validation.constraints.NotNull;
import si.plaan.entity.InspectionParameterResult;

public record FinishedGoodsInspectionParameterResultRequest(
    @NotNull(message = "Parameter id is required")
    Long parameterId,
    InspectionParameterResult result
) {}
