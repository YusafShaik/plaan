package si.plaan.dto.request;

import jakarta.validation.constraints.NotBlank;

public record InspectionTemplateParameterRequest(
    @NotBlank(message = "Parameter name is required")
    String parameterName,
    @NotBlank(message = "Acceptance criteria is required")
    String acceptanceCriteria
) {}
