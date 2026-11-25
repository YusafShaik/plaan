package si.plaan.dto.response;

public record AuthResponse(
    String accessToken,
    String tokenType,
    long expiresIn,
    UserSummaryResponse user,
    OrganizationSummaryResponse organization
) {}
