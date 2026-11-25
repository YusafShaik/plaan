package si.plaan.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

public record UpdateDispatchOrderRequest(
    @NotNull(message = "Dispatch date is required")
    LocalDate dispatchDate,

    String shippingAddress,
    String transporterName,
    String vehicleNumber,
    String transportReference,
    String notes,

    @NotEmpty(message = "At least one item is required for dispatch")
    @Valid
    List<DispatchOrderItemRequest> items
) {}
