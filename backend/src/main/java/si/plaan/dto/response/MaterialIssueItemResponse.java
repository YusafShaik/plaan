package si.plaan.dto.response;

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
public class MaterialIssueItemResponse {

    private Long id;
    private Long materialId;
    private String materialCode;
    private String materialName;
    private Long productionOrderItemId;
    private BigDecimal requiredQuantity;
    private BigDecimal issuedQuantityBefore;
    private BigDecimal pendingQuantityBefore;
    private BigDecimal issueQuantity;
    private String unitOfMeasure;
}
