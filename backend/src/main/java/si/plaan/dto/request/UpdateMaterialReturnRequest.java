package si.plaan.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateMaterialReturnRequest {

    @NotNull(message = "Return date is required")
    private LocalDate returnDate;

    private Long returnWarehouseId;

    private String notes;

    private boolean postImmediately;

    @NotEmpty(message = "At least one material item is required")
    @Valid
    private List<MaterialReturnItemRequest> items;
}
