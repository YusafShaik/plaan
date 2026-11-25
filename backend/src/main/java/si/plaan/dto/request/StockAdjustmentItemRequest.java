package si.plaan.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockAdjustmentItemRequest {

    @NotNull(message = "Item is required")
    private Long itemId;

    @NotNull(message = "Physical quantity is required")
    @DecimalMin(value = "0.0", message = "Physical quantity cannot be negative")
    private BigDecimal physicalQuantity;

    private BigDecimal systemQuantity;
}
