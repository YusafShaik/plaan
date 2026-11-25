package si.plaan.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MaterialAvailabilityItemResponse {

    private Long materialId;
    private String materialCode;
    private String materialName;
    private BigDecimal bomQuantity;
    private BigDecimal requiredQuantity;
    private BigDecimal issuedQuantity;
    private BigDecimal consumedQuantity;
    private BigDecimal returnedQuantity;
    private BigDecimal remainingQuantity;
    private BigDecimal pendingQuantity;
    private BigDecimal onHandQuantity;
    private BigDecimal shortageQuantity;
    private String availabilityStatus; // "AVAILABLE", "PARTIALLY_AVAILABLE", "NOT_AVAILABLE"
    private String unitOfMeasure;
}
