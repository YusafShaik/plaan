package si.plaan.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import si.plaan.entity.MaterialIssueStatus;

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
public class MaterialIssueResponse {

    private Long id;
    private String issueNumber;
    private LocalDate issueDate;

    private Long productionOrderId;
    private String productionOrderNumber;
    private String orderStatus;

    private Long productId;
    private String productCode;
    private String productName;

    private Long sourceWarehouseId;
    private String sourceWarehouseCode;
    private String sourceWarehouseName;

    private MaterialIssueStatus status;
    private String notes;

    private int totalItems;
    private BigDecimal totalQuantity;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Builder.Default
    private List<MaterialIssueItemResponse> items = new ArrayList<>();
}
