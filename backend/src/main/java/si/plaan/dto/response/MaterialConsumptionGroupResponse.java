package si.plaan.dto.response;

import si.plaan.entity.ProductionOrderStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record MaterialConsumptionGroupResponse(
    Long productionOrderId,
    String orderNumber,
    LocalDate orderDate,
    Long productId,
    String productCode,
    String productName,
    BigDecimal plannedQuantity,
    String productUnitOfMeasure,
    Long sourceWarehouseId,
    String sourceWarehouseName,
    ProductionOrderStatus status,
    List<MaterialConsumptionLineResponse> lines
) {}
