package si.plaan.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MaterialIssueItemRequest {

    @NotNull(message = "Material is required")
    private Long materialId;

    @NotNull(message = "Issue quantity is required")
    @DecimalMin(value = "0.0", message = "Issue quantity cannot be negative")
    private BigDecimal issueQuantity;
}
