package si.plaan.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockAdjustmentItemResponse {

    private Long id;
    private Long itemId;
    private String itemCode;
    private String itemName;
    private BigDecimal systemQuantity;
    private BigDecimal physicalQuantity;
    private BigDecimal adjustmentQuantity;
    private String unitOfMeasure;
}
