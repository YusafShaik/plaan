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
public class StockTransferItemRequest {

    @NotNull(message = "Item is required")
    private Long itemId;

    @NotNull(message = "Transfer quantity is required")
    @DecimalMin(value = "0.001", message = "Transfer quantity must be greater than zero")
    private BigDecimal transferQuantity;
}
