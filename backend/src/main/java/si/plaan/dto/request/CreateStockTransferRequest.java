package si.plaan.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateStockTransferRequest {

    private String transferNumber;

    @NotNull(message = "Transfer date is required")
    private LocalDate transferDate;

    @NotNull(message = "Source warehouse is required")
    private Long fromWarehouseId;

    @NotNull(message = "Destination warehouse is required")
    private Long toWarehouseId;

    @Size(max = 1000, message = "Notes cannot exceed 1000 characters")
    private String notes;

    private Boolean postImmediately;

    @NotEmpty(message = "At least one item is required")
    @Valid
    private List<StockTransferItemRequest> items;
}
