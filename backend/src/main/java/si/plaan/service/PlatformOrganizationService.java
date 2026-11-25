package si.plaan.service;

import si.plaan.dto.request.CreateOrganizationRequest;
import si.plaan.dto.request.UpdateOrganizationStatusRequest;
import si.plaan.dto.response.OrganizationResponse;

import java.util.List;

public interface PlatformOrganizationService {
    List<OrganizationResponse> getAllOrganizations();
    OrganizationResponse createOrganization(CreateOrganizationRequest request);
    OrganizationResponse updateOrganizationStatus(Long id, UpdateOrganizationStatusRequest request);
}
