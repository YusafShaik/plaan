package si.plaan.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateCustomerRequest(
    @NotBlank(message = "Customer name is required")
    @Size(max = 150, message = "Customer name cannot exceed 150 characters")
    String name,

    @Size(max = 100, message = "Contact person cannot exceed 100 characters")
    String contactPerson,

    @Size(max = 30, message = "Phone number cannot exceed 30 characters")
    String phone,

    @Size(max = 100, message = "Email cannot exceed 100 characters")
    String email,

    @Size(max = 500, message = "Billing address cannot exceed 500 characters")
    String billingAddress,

    @Size(max = 500, message = "Shipping address cannot exceed 500 characters")
    String shippingAddress,

    @Size(max = 50, message = "GSTIN / Tax ID cannot exceed 50 characters")
    String taxId,

    Boolean active
) {}
