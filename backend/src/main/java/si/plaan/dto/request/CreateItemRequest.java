package si.plaan.dto.request;

import jakarta.validation.constraints.NotBlank;

public record CreateItemRequest(
    @NotBlank(message = "Item code is required")
    String itemCode,

    @NotBlank(message = "Item name is required")
    String name,

    Long itemTypeId,

    String newItemTypeName,

    Long prefixId,

    String newPrefix,

    @NotBlank(message = "Unit of measure is required")
    String unitOfMeasure,

    String description,

    Boolean active
) {}
