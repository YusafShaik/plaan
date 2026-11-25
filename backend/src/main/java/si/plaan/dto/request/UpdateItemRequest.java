package si.plaan.dto.request;

import jakarta.validation.constraints.NotBlank;

public record UpdateItemRequest(
    @NotBlank(message = "Item name is required")
    String name,

    Long itemTypeId,

    String newItemTypeName,

    @NotBlank(message = "Unit of measure is required")
    String unitOfMeasure,

    String description,

    Boolean active
) {}
