package si.plaan.service;

import org.springframework.data.domain.Pageable;
import si.plaan.dto.request.CreateSalesOrderRequest;
import si.plaan.dto.request.UpdateSalesOrderRequest;
import si.plaan.dto.response.PageResponse;
import si.plaan.dto.response.SalesOrderResponse;
import si.plaan.dto.response.SalesOrderStockAvailabilityResponse;
import si.plaan.dto.response.SalesOrderSummaryResponse;
import si.plaan.entity.SalesOrderStatus;

public interface SalesOrderService {

    PageResponse<SalesOrderResponse> getSalesOrders(Long orgId, String search, SalesOrderStatus status, Long customerId, Pageable pageable);

    SalesOrderResponse getSalesOrderById(Long orgId, Long id);

    SalesOrderSummaryResponse getSummary(Long orgId);

    String getNextSalesOrderNumber(Long orgId);

    SalesOrderResponse createSalesOrder(Long orgId, CreateSalesOrderRequest request);

    SalesOrderResponse updateSalesOrder(Long orgId, Long id, UpdateSalesOrderRequest request);

    SalesOrderResponse confirmSalesOrder(Long orgId, Long id);

    SalesOrderResponse cancelSalesOrder(Long orgId, Long id);

    SalesOrderStockAvailabilityResponse checkStockAvailability(Long orgId, Long id);

    void deleteSalesOrder(Long orgId, Long id);
}
