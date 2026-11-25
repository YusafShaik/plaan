package si.plaan.service.impl;

import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.request.CreateCustomerRequest;
import si.plaan.dto.request.UpdateCustomerRequest;
import si.plaan.dto.response.CustomerResponse;
import si.plaan.dto.response.CustomerSummaryResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.entity.Customer;
import si.plaan.entity.Organization;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.CustomerRepository;
import si.plaan.repository.OrganizationRepository;
import si.plaan.service.CustomerService;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomerServiceImpl implements CustomerService {

    private final CustomerRepository customerRepository;
    private final OrganizationRepository organizationRepository;
    private final si.plaan.repository.SalesOrderRepository salesOrderRepository;

    private static final String CUSTOMER_PREFIX = "CUS-";
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

    @Override
    @Transactional(readOnly = true)
    public PageResponse<CustomerResponse> getCustomers(Long orgId, String search, Boolean active, Pageable pageable) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        Specification<Customer> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("organization").get("id"), orgId));

            if (active != null) {
                predicates.add(cb.equal(root.get("active"), active));
            }

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                Predicate nameLike = cb.like(cb.lower(root.get("name")), pattern);
                Predicate codeLike = cb.like(cb.lower(root.get("customerCode")), pattern);
                Predicate contactLike = cb.like(cb.lower(root.get("contactPerson")), pattern);
                Predicate phoneLike = cb.like(cb.lower(root.get("phone")), pattern);
                Predicate emailLike = cb.like(cb.lower(root.get("email")), pattern);
                Predicate taxIdLike = cb.like(cb.lower(root.get("taxId")), pattern);
                predicates.add(cb.or(nameLike, codeLike, contactLike, phoneLike, emailLike, taxIdLike));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Customer> customerPage = customerRepository.findAll(spec, pageable);
        return PageResponse.from(customerPage.map(this::mapToResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public CustomerResponse getCustomerById(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        Customer customer = customerRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + id));
        return mapToResponse(customer);
    }

    @Override
    @Transactional(readOnly = true)
    public CustomerSummaryResponse getSummary(Long orgId) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        long total = customerRepository.countByOrganizationId(orgId);
        long active = customerRepository.countByOrganizationIdAndActive(orgId, true);
        long inactive = total - active;
        return new CustomerSummaryResponse(total, active, inactive);
    }

    @Override
    @Transactional(readOnly = true)
    public String getNextCustomerCode(Long orgId) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        int maxNum = customerRepository.findMaxCustomerNumberByOrganizationId(orgId);
        return String.format("%s%03d", CUSTOMER_PREFIX, maxNum + 1);
    }

    @Override
    @Transactional
    public CustomerResponse createCustomer(Long orgId, CreateCustomerRequest request) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        if (request.name() == null || request.name().trim().isBlank()) {
            throw new IllegalArgumentException("Customer name is required");
        }

        String finalCode;
        if (request.customerCode() != null && !request.customerCode().trim().isBlank()) {
            finalCode = request.customerCode().trim().toUpperCase();
        } else {
            finalCode = getNextCustomerCode(orgId);
        }

        if (customerRepository.existsByOrganizationIdAndCustomerCodeIgnoreCase(orgId, finalCode)) {
            throw new IllegalArgumentException("Customer code '" + finalCode + "' is already registered in this organization");
        }

        validateEmail(request.email());

        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with id: " + orgId));

        Customer customer = Customer.builder()
                .organization(org)
                .customerCode(finalCode)
                .name(request.name().trim())
                .contactPerson(cleanString(request.contactPerson()))
                .phone(cleanString(request.phone()))
                .email(cleanString(request.email()))
                .billingAddress(cleanString(request.billingAddress()))
                .shippingAddress(cleanString(request.shippingAddress()))
                .taxId(request.taxId() != null && !request.taxId().isBlank() ? request.taxId().trim().toUpperCase() : null)
                .active(request.active() == null || request.active())
                .build();

        Customer saved = customerRepository.save(customer);
        log.info("Customer created: id={}, code={}, name={}, orgId={}", saved.getId(), saved.getCustomerCode(), saved.getName(), orgId);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public CustomerResponse updateCustomer(Long orgId, Long id, UpdateCustomerRequest request) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        if (request.name() == null || request.name().trim().isBlank()) {
            throw new IllegalArgumentException("Customer name is required");
        }

        Customer customer = customerRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + id));

        validateEmail(request.email());

        customer.setName(request.name().trim());
        customer.setContactPerson(cleanString(request.contactPerson()));
        customer.setPhone(cleanString(request.phone()));
        customer.setEmail(cleanString(request.email()));
        customer.setBillingAddress(cleanString(request.billingAddress()));
        customer.setShippingAddress(cleanString(request.shippingAddress()));
        customer.setTaxId(request.taxId() != null && !request.taxId().isBlank() ? request.taxId().trim().toUpperCase() : null);

        if (request.active() != null) {
            customer.setActive(request.active());
        }

        Customer saved = customerRepository.save(customer);
        log.info("Customer updated: id={}, code={}, orgId={}", saved.getId(), saved.getCustomerCode(), orgId);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public CustomerResponse toggleStatus(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        Customer customer = customerRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + id));

        customer.setActive(!customer.isActive());
        Customer saved = customerRepository.save(customer);
        log.info("Customer status toggled: id={}, code={}, active={}", saved.getId(), saved.getCustomerCode(), saved.isActive());
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public void deleteCustomer(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        Customer customer = customerRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + id));

        if (salesOrderRepository.existsByOrganizationIdAndCustomerId(orgId, id)) {
            throw new IllegalStateException("Customer cannot be deleted because it is referenced in sales transactions.");
        }

        customerRepository.delete(customer);
        log.info("Customer deleted: id={}, code={}, orgId={}", customer.getId(), customer.getCustomerCode(), orgId);
    }

    private void validateEmail(String email) {
        if (email != null && !email.trim().isBlank()) {
            String trimmed = email.trim();
            if (!EMAIL_PATTERN.matcher(trimmed).matches()) {
                throw new IllegalArgumentException("Invalid email format: '" + trimmed + "'");
            }
        }
    }

    private String cleanString(String s) {
        if (s == null || s.trim().isBlank()) {
            return null;
        }
        return s.trim();
    }

    private CustomerResponse mapToResponse(Customer c) {
        return new CustomerResponse(
                c.getId(),
                c.getCustomerCode(),
                c.getName(),
                c.getContactPerson(),
                c.getPhone(),
                c.getEmail(),
                c.getBillingAddress(),
                c.getShippingAddress(),
                c.getTaxId(),
                c.isActive(),
                c.getCreatedAt(),
                c.getUpdatedAt()
        );
    }
}
