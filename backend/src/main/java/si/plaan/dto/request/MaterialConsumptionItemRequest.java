package si.plaan.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MaterialConsumptionItemRequest {

    @NotNull(message = "Material ID is required")
    private Long materialId;

    @NotNull(message = "Consumed quantity is required")
    @DecimalMin(value = "0.0", message = "Consumed quantity cannot be negative")
    private BigDecimal consumedQuantity;
}
