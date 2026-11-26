package si.plaan.service;

import org.springframework.data.domain.Pageable;
import si.plaan.dto.request.CompleteMaintenanceWorkOrderRequest;
import si.plaan.dto.request.CreateMaintenanceWorkOrderRequest;
import si.plaan.dto.request.StartMaintenanceWorkOrderRequest;
import si.plaan.dto.response.EquipmentMaintenanceHistoryItemResponse;
import si.plaan.dto.response.MaintenanceWorkOrderResponse;
import si.plaan.dto.response.MaintenanceWorkOrderSummaryResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.entity.MaintenanceWorkOrderStatus;
import si.plaan.entity.MaintenanceWorkOrderType;

import java.util.List;

public interface MaintenanceWorkOrderService {

    PageResponse<MaintenanceWorkOrderResponse> getWorkOrders(
            Long orgId,
            String search,
            MaintenanceWorkOrderStatus status,
            MaintenanceWorkOrderType type,
            Long equipmentId,
            Pageable pageable);

    MaintenanceWorkOrderSummaryResponse getSummary(Long orgId);

    List<EquipmentMaintenanceHistoryItemResponse> getHistoryByEquipment(Long orgId, Long equipmentId);

    MaintenanceWorkOrderResponse getById(Long orgId, Long id);

    String getNextWorkOrderNumber(Long orgId);

    MaintenanceWorkOrderResponse create(Long orgId, CreateMaintenanceWorkOrderRequest request);

    MaintenanceWorkOrderResponse start(Long orgId, Long id, StartMaintenanceWorkOrderRequest request);

    MaintenanceWorkOrderResponse complete(Long orgId, Long id, CompleteMaintenanceWorkOrderRequest request);

    MaintenanceWorkOrderResponse cancel(Long orgId, Long id);

    boolean hasUnresolvedWorkOrders(Long orgId, Long equipmentId);
}
