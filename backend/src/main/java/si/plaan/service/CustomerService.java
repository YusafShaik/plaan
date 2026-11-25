package si.plaan.service;

import org.springframework.data.domain.Pageable;
import si.plaan.dto.request.CreateCustomerRequest;
import si.plaan.dto.request.UpdateCustomerRequest;
import si.plaan.dto.response.CustomerResponse;
import si.plaan.dto.response.CustomerSummaryResponse;
import si.plaan.dto.response.PageResponse;

public interface CustomerService {

    PageResponse<CustomerResponse> getCustomers(Long orgId, String search, Boolean active, Pageable pageable);

    CustomerResponse getCustomerById(Long orgId, Long id);

    CustomerSummaryResponse getSummary(Long orgId);

    String getNextCustomerCode(Long orgId);

    CustomerResponse createCustomer(Long orgId, CreateCustomerRequest request);

    CustomerResponse updateCustomer(Long orgId, Long id, UpdateCustomerRequest request);

    CustomerResponse toggleStatus(Long orgId, Long id);

    void deleteCustomer(Long orgId, Long id);
}
