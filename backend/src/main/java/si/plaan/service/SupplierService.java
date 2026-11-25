package si.plaan.service;

import org.springframework.data.domain.Pageable;
import si.plaan.dto.request.CreateSupplierRequest;
import si.plaan.dto.request.UpdateSupplierRequest;
import si.plaan.dto.response.PageResponse;
import si.plaan.dto.response.SupplierResponse;
import si.plaan.dto.response.SupplierSummaryResponse;

public interface SupplierService {

    PageResponse<SupplierResponse> getSuppliers(Long orgId, String search, Boolean active, Pageable pageable);

    SupplierResponse getSupplierById(Long orgId, Long id);

    SupplierSummaryResponse getSummary(Long orgId);

    String getNextSupplierCode(Long orgId);

    SupplierResponse createSupplier(Long orgId, CreateSupplierRequest request);

    SupplierResponse updateSupplier(Long orgId, Long id, UpdateSupplierRequest request);

    SupplierResponse toggleStatus(Long orgId, Long id);
}
