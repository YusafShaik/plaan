package si.plaan.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
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
public class UpdateStockAdjustmentRequest {

    @NotNull(message = "Warehouse is required")
    private Long warehouseId;

    private LocalDate adjustmentDate;

    @NotBlank(message = "Adjustment reason is required")
    private String reason;

    private String notes;

    @NotEmpty(message = "At least one item is required")
    @Valid
    private List<StockAdjustmentItemRequest> items;
}
