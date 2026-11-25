package si.plaan.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateItemPrefixRequest(
    @NotBlank(message = "Prefix string is required")
    @Size(max = 20, message = "Prefix cannot exceed 20 characters")
    String prefix,

    String description,

    Long initialNumber,

    Integer paddingDigits
) {}
