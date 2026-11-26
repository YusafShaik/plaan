package si.plaan.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import si.plaan.entity.ProductionOrderStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductionOrderResponse {

    private Long id;
    private String orderNumber;
    private LocalDate orderDate;

    private Long productId;
    private String productCode;
    private String productName;

    private Long bomId;
    private String bomCode;
    private BigDecimal bomOutputQuantity;

    private BigDecimal productionQuantity;
    private BigDecimal receivedQuantity;
    private BigDecimal pendingProductionQuantity;
    private BigDecimal productionProgress;
    /** Quality-held manufactured qty awaiting FGI (PENDING/DRAFT). */
    private BigDecimal qualityPendingQuantity;
    /** Quality-accepted finished goods from completed FGIs. */
    private BigDecimal qualityAcceptedQuantity;
    /** Quality-rejected finished goods from completed FGIs. */
    private BigDecimal qualityRejectedQuantity;
    private String unitOfMeasure;

    private LocalDate plannedStartDate;
    private LocalDate plannedEndDate;

    private Long sourceWarehouseId;
    private String sourceWarehouseCode;
    private String sourceWarehouseName;

    private Long finishedGoodsWarehouseId;
    private String finishedGoodsWarehouseCode;
    private String finishedGoodsWarehouseName;

    private ProductionOrderStatus status;
    private String notes;

    private LocalDate completedDate;
    private String completedBy;
    private LocalDate closedDate;
    private String closedBy;
    private String closureNotes;

    private int totalComponents;
    private String overallAvailability; // "ALL_MATERIALS_AVAILABLE" or "MATERIAL_SHORTAGE"
    private int shortageCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Builder.Default
    private List<ProductionOrderItemResponse> items = new ArrayList<>();
}
