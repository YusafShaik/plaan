package si.plaan.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SalesOrderStockAvailabilityResponse {

    private Long salesOrderId;
    private String orderNumber;
    private Long dispatchWarehouseId;
    private String dispatchWarehouseCode;
    private String dispatchWarehouseName;
    private String overallStatus; // "AVAILABLE" or "STOCK_SHORTAGE"
    private int totalItems;
    private int availableItems;
    private int shortageItems;

    @Builder.Default
    private List<SalesOrderStockAvailabilityItemResponse> items = new ArrayList<>();
}
