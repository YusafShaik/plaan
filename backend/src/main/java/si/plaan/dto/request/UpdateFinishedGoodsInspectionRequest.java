package si.plaan.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record UpdateFinishedGoodsInspectionRequest(
    LocalDate inspectionDate,
    @DecimalMin(value = "0", message = "Accepted quantity cannot be negative")
    BigDecimal acceptedQuantity,
    String remarks,
    boolean complete,
    @Valid
    List<FinishedGoodsInspectionParameterResultRequest> parameterResults
) {}
