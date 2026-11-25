package si.plaan.service;

import org.springframework.data.domain.Pageable;
import si.plaan.dto.request.CreateDispatchOrderRequest;
import si.plaan.dto.request.UpdateDispatchOrderRequest;
import si.plaan.dto.response.DispatchOrderResponse;
import si.plaan.dto.response.DispatchPrepareResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.entity.DispatchOrderStatus;

import java.util.List;

public interface DispatchOrderService {

    PageResponse<DispatchOrderResponse> getDispatchOrders(
            Long orgId, String search, DispatchOrderStatus status, Long salesOrderId, Pageable pageable
    );

    List<DispatchOrderResponse> getDispatchOrdersBySalesOrder(Long orgId, Long salesOrderId);

    DispatchOrderResponse getDispatchOrderById(Long orgId, Long id);

    String getNextDispatchNumber(Long orgId);

    DispatchPrepareResponse prepareDispatchForSalesOrder(Long orgId, Long salesOrderId);

    DispatchOrderResponse createDispatchOrder(Long orgId, CreateDispatchOrderRequest request);

    DispatchOrderResponse updateDispatchOrder(Long orgId, Long id, UpdateDispatchOrderRequest request);

    DispatchOrderResponse postDispatchOrder(Long orgId, Long id);

    void deleteDispatchOrder(Long orgId, Long id);
}
