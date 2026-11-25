package si.plaan.dto.response;

import java.time.LocalDateTime;

public record CustomerResponse(
    Long id,
    String customerCode,
    String name,
    String contactPerson,
    String phone,
    String email,
    String billingAddress,
    String shippingAddress,
    String taxId,
    boolean active,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
