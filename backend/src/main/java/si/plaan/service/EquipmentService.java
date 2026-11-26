package si.plaan.service;

import org.springframework.data.domain.Pageable;
import si.plaan.dto.request.CreateEquipmentRequest;
import si.plaan.dto.request.UpdateEquipmentRequest;
import si.plaan.dto.response.EquipmentResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.entity.EquipmentOperationalStatus;
import si.plaan.entity.EquipmentRecordStatus;

public interface EquipmentService {

    PageResponse<EquipmentResponse> getEquipment(
            Long orgId,
            String search,
            EquipmentOperationalStatus operationalStatus,
            EquipmentRecordStatus recordStatus,
            Pageable pageable
    );

    EquipmentResponse getById(Long orgId, Long id);

    String getNextEquipmentCode(Long orgId);

    EquipmentResponse create(Long orgId, CreateEquipmentRequest request);

    EquipmentResponse update(Long orgId, Long id, UpdateEquipmentRequest request);

    EquipmentResponse activate(Long orgId, Long id);

    EquipmentResponse deactivate(Long orgId, Long id);
}
