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
public class CreateProductionReceiptRequest {

    private String receiptNumber;

    @NotNull(message = "Receipt date is required")
    private LocalDate receiptDate;

    @NotNull(message = "Production order ID is required")
    private Long productionOrderId;

    @NotNull(message = "Receipt quantity is required")
    @DecimalMin(value = "0.0001", message = "Receipt quantity must be greater than zero")
    private BigDecimal receiptQuantity;

    private String notes;

    private boolean postImmediately;
}
