package si.plaan.dto.response;

public record ExpenseCategoryResponse(
    Long id,
    String name,
    boolean active,
    int sortOrder
) {}
