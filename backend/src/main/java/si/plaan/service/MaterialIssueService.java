package si.plaan.service;

import org.springframework.data.domain.Pageable;
import si.plaan.dto.request.CreateMaterialIssueRequest;
import si.plaan.dto.request.UpdateMaterialIssueRequest;
import si.plaan.dto.response.MaterialIssueResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.entity.MaterialIssueStatus;

import java.util.List;

public interface MaterialIssueService {

    PageResponse<MaterialIssueResponse> getMaterialIssues(
            Long orgId,
            Long productionOrderId,
            MaterialIssueStatus status,
            Pageable pageable
    );

    MaterialIssueResponse getMaterialIssueById(Long orgId, Long id);

    String getNextMaterialIssueNumber(Long orgId);

    MaterialIssueResponse createMaterialIssue(Long orgId, CreateMaterialIssueRequest request);

    MaterialIssueResponse updateMaterialIssue(Long orgId, Long id, UpdateMaterialIssueRequest request);

    MaterialIssueResponse postMaterialIssue(Long orgId, Long id);

    void deleteDraftMaterialIssue(Long orgId, Long id);

    List<MaterialIssueResponse> getMaterialIssuesByProductionOrder(Long orgId, Long productionOrderId);
}
