package si.plaan.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateBomRequest {

    private String bomCode;

    @NotNull(message = "Product is required")
    private Long productId;

    @Builder.Default
    @DecimalMin(value = "0.0001", message = "Output quantity must be greater than zero")
    private BigDecimal outputQuantity = BigDecimal.ONE;

    private String notes;

    private boolean saveAndActivate;

    @Valid
    @Builder.Default
    private List<BomItemRequest> items = new ArrayList<>();
}
