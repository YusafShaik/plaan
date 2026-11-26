package si.plaan.dto.request;

import jakarta.validation.constraints.NotBlank;

public record CreateExpenseCategoryRequest(
    @NotBlank(message = "Category name is required")
    String name
) {}
