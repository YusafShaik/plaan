package si.plaan.dto.response;

import java.time.LocalDate;
import java.util.List;

public record EligibleGrnResponse(
    Long id,
    String grnNumber,
    Long purchaseOrderId,
    String poNumber,
    Long supplierId,
    String supplierCode,
    String supplierName,
    Long warehouseId,
    String warehouseCode,
    String warehouseName,
    LocalDate receiptDate,
    List<EligibleGrnItemResponse> items
) {}
