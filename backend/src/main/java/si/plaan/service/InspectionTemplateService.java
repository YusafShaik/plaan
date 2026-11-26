package si.plaan.service;

import org.springframework.data.domain.Pageable;
import si.plaan.dto.request.CreateInspectionTemplateRequest;
import si.plaan.dto.request.UpdateInspectionTemplateRequest;
import si.plaan.dto.response.InspectionTemplateResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.entity.InspectionTemplateStatus;
import si.plaan.entity.InspectionType;

public interface InspectionTemplateService {

    PageResponse<InspectionTemplateResponse> getTemplates(
            Long orgId,
            String search,
            InspectionTemplateStatus status,
            InspectionType inspectionType,
            Pageable pageable
    );

    InspectionTemplateResponse getById(Long orgId, Long id);

    String getNextTemplateCode(Long orgId);

    InspectionTemplateResponse create(Long orgId, CreateInspectionTemplateRequest request);

    InspectionTemplateResponse update(Long orgId, Long id, UpdateInspectionTemplateRequest request);

    InspectionTemplateResponse activate(Long orgId, Long id);

    InspectionTemplateResponse deactivate(Long orgId, Long id);

    void deleteDraft(Long orgId, Long id);

    InspectionTemplateResponse getActiveForItemAndType(Long orgId, Long itemId, InspectionType inspectionType);
}
