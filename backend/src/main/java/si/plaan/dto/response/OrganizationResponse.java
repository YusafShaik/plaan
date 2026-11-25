package si.plaan.dto.response;

import java.time.LocalDateTime;

public record OrganizationResponse(
    Long id,
    String name,
    String slug,
    String country,
    String baseCurrency,
    String timeZone,
    boolean active,
    String adminName,
    String adminEmail,
    LocalDateTime createdAt
) {}
