package si.plaan.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductionOrderClosureValidationResponse {
    private Long productionOrderId;
    private String orderNumber;
    private String status;
    private BigDecimal plannedQuantity;
    private BigDecimal receivedQuantity;
    private String unitOfMeasure;

    private boolean productionCompleted;
    private boolean allPlannedQuantitiesReceived;
    private boolean allMaterialsReconciled;
    private boolean noPendingDraftTransactions;
    private boolean allQualityInspectionsCompleted;
    private boolean canClose;

    private int pendingDraftTransactionsCount;
    private int unreconciledMaterialsCount;
    private int pendingQualityInspectionsCount;

    private List<MaterialReconciliationItemResponse> materials;
}
