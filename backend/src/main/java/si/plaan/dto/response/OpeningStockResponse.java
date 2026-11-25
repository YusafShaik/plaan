package si.plaan.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import si.plaan.entity.OpeningStockStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OpeningStockResponse {
    private Long id;
    private String openingStockNumber;
    private Long warehouseId;
    private String warehouseCode;
    private String warehouseName;
    private LocalDate openingDate;
    private String notes;
    private OpeningStockStatus status;
    private int totalItems;
    private List<OpeningStockItemResponse> items;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
