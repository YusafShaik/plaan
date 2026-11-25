package si.plaan.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import si.plaan.entity.ProductionReceiptStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductionReceiptResponse {

    private Long id;
    private String receiptNumber;
    private LocalDate receiptDate;

    private Long productionOrderId;
    private String productionOrderNumber;

    private Long productId;
    private String productCode;
    private String productName;

    private Long receivingWarehouseId;
    private String receivingWarehouseCode;
    private String receivingWarehouseName;

    private BigDecimal receiptQuantity;
    private String unitOfMeasure;

    private ProductionReceiptStatus status;
    private String notes;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
