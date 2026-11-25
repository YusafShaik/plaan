package si.plaan.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import si.plaan.dto.request.CreateCustomerRequest;
import si.plaan.dto.request.UpdateCustomerRequest;
import si.plaan.dto.response.ApiResponse;
import si.plaan.dto.response.CustomerResponse;
import si.plaan.dto.response.CustomerSummaryResponse;
import si.plaan.dto.response.NextCodeResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.security.CustomUserDetails;
import si.plaan.service.CustomerService;

@RestController
@RequestMapping("/api/v1/master-data/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<CustomerResponse>>> getCustomers(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean active,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {

        Sort sort = "asc".equalsIgnoreCase(direction) ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), sort);

        PageResponse<CustomerResponse> response = customerService.getCustomers(
                userDetails.getOrganizationId(),
                search,
                active,
                pageable
        );

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/next-code")
    public ResponseEntity<ApiResponse<NextCodeResponse>> getNextCode(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        String nextCode = customerService.getNextCustomerCode(userDetails.getOrganizationId());
        return ResponseEntity.ok(ApiResponse.success(new NextCodeResponse(nextCode)));
    }

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<CustomerSummaryResponse>> getSummary(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        CustomerSummaryResponse summary = customerService.getSummary(userDetails.getOrganizationId());
        return ResponseEntity.ok(ApiResponse.success(summary));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CustomerResponse>> getCustomerById(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        CustomerResponse response = customerService.getCustomerById(userDetails.getOrganizationId(), id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CustomerResponse>> createCustomer(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CreateCustomerRequest request) {
        CustomerResponse response = customerService.createCustomer(userDetails.getOrganizationId(), request);
        return ResponseEntity.ok(ApiResponse.success("Customer created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CustomerResponse>> updateCustomer(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody UpdateCustomerRequest request) {
        CustomerResponse response = customerService.updateCustomer(userDetails.getOrganizationId(), id, request);
        return ResponseEntity.ok(ApiResponse.success("Customer updated successfully", response));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<CustomerResponse>> toggleStatus(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        CustomerResponse response = customerService.toggleStatus(userDetails.getOrganizationId(), id);
        return ResponseEntity.ok(ApiResponse.success("Customer status updated successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCustomer(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        customerService.deleteCustomer(userDetails.getOrganizationId(), id);
        return ResponseEntity.ok(ApiResponse.success("Customer deleted successfully", null));
    }
}
