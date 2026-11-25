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
public class ProductionOrderAvailabilityResponse {

    private Long productionOrderId;
    private String orderNumber;
    private Long sourceWarehouseId;
    private String sourceWarehouseCode;
    private String sourceWarehouseName;
    private String overallAvailability; // "ALL_MATERIALS_AVAILABLE" or "MATERIAL_SHORTAGE"
    private int totalComponents;
    private int shortageCount;
    private int availableCount;

    @Builder.Default
    private List<MaterialAvailabilityItemResponse> items = new ArrayList<>();
}
