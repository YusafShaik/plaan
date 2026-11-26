package si.plaan.service;

import org.springframework.data.domain.Pageable;
import si.plaan.dto.request.CreateMaintenancePlanRequest;
import si.plaan.dto.request.UpdateMaintenancePlanRequest;
import si.plaan.dto.response.MaintenancePlanResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.entity.MaintenancePlanStatus;
import si.plaan.entity.MaintenanceScheduleStatus;

import java.util.List;

public interface MaintenancePlanService {

    PageResponse<MaintenancePlanResponse> getPlans(
            Long orgId,
            String search,
            MaintenancePlanStatus status,
            MaintenanceScheduleStatus scheduleStatus,
            Long equipmentId,
            Pageable pageable
    );

    List<MaintenancePlanResponse> getPlansByEquipment(Long orgId, Long equipmentId);

    MaintenancePlanResponse getById(Long orgId, Long id);

    String getNextPlanNumber(Long orgId);

    MaintenancePlanResponse create(Long orgId, CreateMaintenancePlanRequest request);

    MaintenancePlanResponse update(Long orgId, Long id, UpdateMaintenancePlanRequest request);

    MaintenancePlanResponse activate(Long orgId, Long id);

    MaintenancePlanResponse deactivate(Long orgId, Long id);
}
