package si.plaan.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record CreateOrganizationRequest(
    @NotBlank(message = "Organization name is required")
    String organizationName,

    @NotBlank(message = "Country is required")
    String country,

    @NotBlank(message = "Base currency is required")
    String baseCurrency,

    @NotBlank(message = "Time zone is required")
    String timeZone,

    @NotBlank(message = "Administrator full name is required")
    String adminFullName,

    @NotBlank(message = "Administrator work email is required")
    @Email(message = "Invalid work email format")
    String adminEmail
) {}
