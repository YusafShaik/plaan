package si.plaan.dto.request;

import jakarta.validation.constraints.NotBlank;

public record ItemTypeRequest(
    @NotBlank(message = "Item type name is required")
    String name,

    String description
) {}
