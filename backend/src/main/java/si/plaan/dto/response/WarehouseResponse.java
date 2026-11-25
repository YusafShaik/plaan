package si.plaan.dto.response;

import java.time.LocalDateTime;

public record WarehouseResponse(
    Long id,
    String warehouseCode,
    String name,
    String address,
    String description,
    boolean active,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
