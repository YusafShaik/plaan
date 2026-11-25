package si.plaan.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import si.plaan.entity.MaterialConsumptionStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MaterialConsumptionResponse {

    private Long id;
    private String consumptionNumber;
    private LocalDate consumptionDate;
    private Long productionOrderId;
    private String productionOrderNumber;
    private String orderStatus;
    private Long productId;
    private String productCode;
    private String productName;
    private MaterialConsumptionStatus status;
    private String notes;
    private int totalItems;
    private BigDecimal totalQuantity;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<MaterialConsumptionItemResponse> items;
}
