package si.plaan.dto.request;

import jakarta.validation.constraints.NotNull;
import si.plaan.entity.PurchaseOrderStatus;

public record UpdatePurchaseOrderStatusRequest(
    @NotNull(message = "Status is required")
    PurchaseOrderStatus status
) {}
