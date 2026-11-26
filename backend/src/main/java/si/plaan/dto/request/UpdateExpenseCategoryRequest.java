package si.plaan.dto.request;

import jakarta.validation.constraints.NotBlank;

public record UpdateExpenseCategoryRequest(
    @NotBlank(message = "Category name is required")
    String name,
    Boolean active
) {}
