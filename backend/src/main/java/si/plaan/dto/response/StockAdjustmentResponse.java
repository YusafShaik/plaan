package si.plaan.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import si.plaan.entity.StockAdjustmentStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockAdjustmentResponse {

    private Long id;
    private String adjustmentNumber;
    private Long warehouseId;
    private String warehouseCode;
    private String warehouseName;
    private LocalDate adjustmentDate;
    private String reason;
    private String notes;
    private StockAdjustmentStatus status;
    private int totalItems;
    private BigDecimal totalDifference;
    private List<StockAdjustmentItemResponse> items;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
