package si.plaan.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateWarehouseRequest(
    @NotBlank(message = "Warehouse name is required")
    @Size(max = 150, message = "Warehouse name cannot exceed 150 characters")
    String name,

    @Size(max = 500, message = "Address/Location cannot exceed 500 characters")
    String address,

    @Size(max = 500, message = "Description cannot exceed 500 characters")
    String description,

    Boolean active
) {}
