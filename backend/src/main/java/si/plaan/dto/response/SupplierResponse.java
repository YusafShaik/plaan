package si.plaan.dto.response;

import java.time.LocalDateTime;

public record SupplierResponse(
    Long id,
    String supplierCode,
    String name,
    String contactPerson,
    String phone,
    String email,
    String address,
    String taxId,
    boolean active,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
