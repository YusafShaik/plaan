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
public class SalesOrderStockAvailabilityItemResponse {

    private Long itemId;
    private String itemCode;
    private String itemName;
    private String unitOfMeasure;
    private BigDecimal orderedQuantity;
    private BigDecimal dispatchedQuantity;
    private BigDecimal pendingQuantity;
    private BigDecimal onHandQuantity;
    private BigDecimal shortageQuantity;
    private String status; // "AVAILABLE", "PARTIALLY_AVAILABLE", "NOT_AVAILABLE"
}
