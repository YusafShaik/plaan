package si.plaan.dto.response;

import java.time.LocalDate;
import java.util.List;

public record EligibleDispatchResponse(
    Long id,
    String dispatchNumber,
    Long salesOrderId,
    String salesOrderNumber,
    Long customerId,
    String customerCode,
    String customerName,
    String billingAddress,
    String shippingAddress,
    Long warehouseId,
    String warehouseCode,
    String warehouseName,
    LocalDate dispatchDate,
    List<EligibleDispatchItemResponse> items
) {}
