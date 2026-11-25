package si.plaan.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateProductionOrderRequest {

    private String orderNumber;

    @NotNull(message = "Order date is required")
    private LocalDate orderDate;

    @NotNull(message = "Product is required")
    private Long productId;

    @NotNull(message = "Production quantity is required")
    @DecimalMin(value = "0.0001", message = "Production quantity must be greater than zero")
    private BigDecimal productionQuantity;

    private LocalDate plannedStartDate;

    private LocalDate plannedEndDate;

    @NotNull(message = "Source warehouse is required")
    private Long sourceWarehouseId;

    @NotNull(message = "Finished goods warehouse is required")
    private Long finishedGoodsWarehouseId;

    private String notes;

    private boolean releaseImmediately;
}
