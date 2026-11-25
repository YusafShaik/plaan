package si.plaan.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateMaterialIssueRequest {

    private String issueNumber;

    @NotNull(message = "Issue date is required")
    private LocalDate issueDate;

    @NotNull(message = "Production order is required")
    private Long productionOrderId;

    private String notes;

    @Builder.Default
    private boolean postImmediately = false;

    @NotEmpty(message = "At least one item is required")
    @Valid
    private List<MaterialIssueItemRequest> items;
}
