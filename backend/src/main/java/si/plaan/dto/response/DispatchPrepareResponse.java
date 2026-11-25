package si.plaan.dto.response;

import java.util.List;

public record DispatchPrepareResponse(
    Long salesOrderId,
    String salesOrderNumber,
    Long customerId,
    String customerCode,
    String customerName,
    Long dispatchWarehouseId,
    String dispatchWarehouseCode,
    String dispatchWarehouseName,
    String shippingAddress,
    List<DispatchPrepareItemResponse> items
) {}
