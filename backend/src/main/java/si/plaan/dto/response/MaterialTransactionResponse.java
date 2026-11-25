package si.plaan.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MaterialTransactionResponse {

    private Long id;
    private String transactionType; // "MATERIAL_ISSUE", "MATERIAL_CONSUMPTION", "MATERIAL_RETURN"
    private String transactionTypeLabel; // "Material Issue", "Material Consumption", "Material Return"
    private String referenceNumber; // "MI-001", "MC-001", "MR-001"
    private LocalDate transactionDate;
    private String status; // "DRAFT", "POSTED"
    private int totalItems;
    private BigDecimal totalQuantity;
    private String notes;
    private LocalDateTime createdAt;
}
