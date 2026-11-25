package si.plaan.dto.response;

import si.plaan.entity.Role;

public record UserSummaryResponse(
    Long id,
    String email,
    String fullName,
    Role role,
    Long organizationId
) {}
