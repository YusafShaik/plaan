package si.plaan.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import si.plaan.entity.InspectionType;

import java.util.List;

public record CreateInspectionTemplateRequest(
    String templateCode,
    @NotBlank(message = "Template name is required")
    String templateName,
    @NotNull(message = "Item is required")
    Long itemId,
    @NotNull(message = "Inspection type is required")
    InspectionType inspectionType,
    String notes,
    boolean activate,
    @Valid
    List<InspectionTemplateParameterRequest> parameters
) {}
