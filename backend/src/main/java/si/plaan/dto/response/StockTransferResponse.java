package si.plaan.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import si.plaan.entity.StockTransferStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockTransferResponse {
    private Long id;
    private String transferNumber;
    private Long fromWarehouseId;
    private String fromWarehouseCode;
    private String fromWarehouseName;
    private Long toWarehouseId;
    private String toWarehouseCode;
    private String toWarehouseName;
    private LocalDate transferDate;
    private String notes;
    private StockTransferStatus status;
    private int totalItems;
    private BigDecimal totalQuantity;
    private List<StockTransferItemResponse> items;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
