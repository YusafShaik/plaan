package si.plaan.dto.response;

import java.time.LocalDateTime;

public record ItemResponse(
    Long id,
    String itemCode,
    String name,
    ItemTypeResponse itemType,
    String unitOfMeasure,
    String description,
    boolean active,
    LocalDateTime createdAt
) {}
