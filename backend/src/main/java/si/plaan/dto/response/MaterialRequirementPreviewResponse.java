package si.plaan.dto.response;

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
public class MaterialRequirementPreviewResponse {

    private Long bomId;
    private String bomCode;
    private BigDecimal bomOutputQuantity;
    private BigDecimal productionQuantity;
    private String unitOfMeasure;

    @Builder.Default
    private List<ProductionOrderItemResponse> items = new ArrayList<>();
}
