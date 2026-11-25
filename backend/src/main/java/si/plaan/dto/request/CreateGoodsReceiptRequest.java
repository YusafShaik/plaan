package si.plaan.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import si.plaan.entity.GoodsReceiptStatus;

import java.time.LocalDate;
import java.util.List;

public record CreateGoodsReceiptRequest(
    String grnNumber,
    @NotNull(message = "Purchase order ID is required")
    Long purchaseOrderId,
    @NotNull(message = "Receipt date is required")
    LocalDate receiptDate,
    String deliveryNoteNumber,
    String notes,
    GoodsReceiptStatus status,
    @NotEmpty(message = "At least one received item is required")
    @Valid
    List<GoodsReceiptItemRequest> items
) {}
