package si.plaan.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import si.plaan.entity.BomStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BomResponse {

    private Long id;
    private String bomCode;
    private Long productId;
    private String productCode;
    private String productName;
    private BigDecimal outputQuantity;
    private String unitOfMeasure;
    private BomStatus status;
    private String notes;
    private int totalComponents;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Builder.Default
    private List<BomItemResponse> items = new ArrayList<>();
}
