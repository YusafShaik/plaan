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
import si.plaan.dto.request.CreateSupplierRequest;
import si.plaan.dto.request.UpdateSupplierRequest;
import si.plaan.dto.response.PageResponse;
import si.plaan.dto.response.SupplierResponse;
import si.plaan.dto.response.SupplierSummaryResponse;
import si.plaan.entity.Organization;
import si.plaan.entity.Supplier;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.OrganizationRepository;
import si.plaan.repository.SupplierRepository;
import si.plaan.service.SupplierService;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SupplierServiceImpl implements SupplierService {

    private final SupplierRepository supplierRepository;
    private final OrganizationRepository organizationRepository;

    private static final String SUPPLIER_PREFIX = "SUP-";

    @Override
    @Transactional(readOnly = true)
    public PageResponse<SupplierResponse> getSuppliers(Long orgId, String search, Boolean active, Pageable pageable) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        Specification<Supplier> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("organization").get("id"), orgId));

            if (active != null) {
                predicates.add(cb.equal(root.get("active"), active));
            }

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                Predicate nameLike = cb.like(cb.lower(root.get("name")), pattern);
                Predicate codeLike = cb.like(cb.lower(root.get("supplierCode")), pattern);
                Predicate contactLike = cb.like(cb.lower(root.get("contactPerson")), pattern);
                Predicate phoneLike = cb.like(cb.lower(root.get("phone")), pattern);
                Predicate emailLike = cb.like(cb.lower(root.get("email")), pattern);
                Predicate taxIdLike = cb.like(cb.lower(root.get("taxId")), pattern);
                predicates.add(cb.or(nameLike, codeLike, contactLike, phoneLike, emailLike, taxIdLike));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Supplier> supplierPage = supplierRepository.findAll(spec, pageable);
        return PageResponse.from(supplierPage.map(this::mapToResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public SupplierResponse getSupplierById(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        Supplier supplier = supplierRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found with id: " + id));
        return mapToResponse(supplier);
    }

    @Override
    @Transactional(readOnly = true)
    public SupplierSummaryResponse getSummary(Long orgId) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        long total = supplierRepository.countByOrganizationId(orgId);
        long active = supplierRepository.countByOrganizationIdAndActive(orgId, true);
        long inactive = total - active;
        return new SupplierSummaryResponse(total, active, inactive);
    }

    @Override
    @Transactional(readOnly = true)
    public String getNextSupplierCode(Long orgId) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        int maxNum = supplierRepository.findMaxSupplierNumberByOrganizationId(orgId);
        return String.format("%s%03d", SUPPLIER_PREFIX, maxNum + 1);
    }

    @Override
    @Transactional
    public SupplierResponse createSupplier(Long orgId, CreateSupplierRequest request) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        String finalCode;
        if (request.supplierCode() != null && !request.supplierCode().trim().isBlank()) {
            finalCode = request.supplierCode().trim().toUpperCase();
        } else {
            finalCode = getNextSupplierCode(orgId);
        }

        if (supplierRepository.existsByOrganizationIdAndSupplierCodeIgnoreCase(orgId, finalCode)) {
            throw new IllegalArgumentException("Supplier code '" + finalCode + "' is already registered in this organization");
        }

        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with id: " + orgId));

        Supplier supplier = Supplier.builder()
                .organization(org)
                .supplierCode(finalCode)
                .name(request.name().trim())
                .contactPerson(request.contactPerson() != null && !request.contactPerson().isBlank() ? request.contactPerson().trim() : null)
                .phone(request.phone() != null && !request.phone().isBlank() ? request.phone().trim() : null)
                .email(request.email() != null && !request.email().isBlank() ? request.email().trim() : null)
                .address(request.address() != null && !request.address().isBlank() ? request.address().trim() : null)
                .taxId(request.taxId() != null && !request.taxId().isBlank() ? request.taxId().trim().toUpperCase() : null)
                .active(request.active() == null || request.active())
                .build();

        Supplier saved = supplierRepository.save(supplier);
        log.info("Supplier created: id={}, code={}, name={}, orgId={}", saved.getId(), saved.getSupplierCode(), saved.getName(), orgId);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public SupplierResponse updateSupplier(Long orgId, Long id, UpdateSupplierRequest request) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        Supplier supplier = supplierRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found with id: " + id));

        supplier.setName(request.name().trim());
        supplier.setContactPerson(request.contactPerson() != null && !request.contactPerson().isBlank() ? request.contactPerson().trim() : null);
        supplier.setPhone(request.phone() != null && !request.phone().isBlank() ? request.phone().trim() : null);
        supplier.setEmail(request.email() != null && !request.email().isBlank() ? request.email().trim() : null);
        supplier.setAddress(request.address() != null && !request.address().isBlank() ? request.address().trim() : null);
        supplier.setTaxId(request.taxId() != null && !request.taxId().isBlank() ? request.taxId().trim().toUpperCase() : null);
        if (request.active() != null) {
            supplier.setActive(request.active());
        }

        Supplier saved = supplierRepository.save(supplier);
        log.info("Supplier updated: id={}, code={}, orgId={}", saved.getId(), saved.getSupplierCode(), orgId);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public SupplierResponse toggleStatus(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        Supplier supplier = supplierRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found with id: " + id));

        supplier.setActive(!supplier.isActive());
        Supplier saved = supplierRepository.save(supplier);
        log.info("Supplier status toggled: id={}, code={}, active={}", saved.getId(), saved.getSupplierCode(), saved.isActive());
        return mapToResponse(saved);
    }

    private SupplierResponse mapToResponse(Supplier s) {
        return new SupplierResponse(
                s.getId(),
                s.getSupplierCode(),
                s.getName(),
                s.getContactPerson(),
                s.getPhone(),
                s.getEmail(),
                s.getAddress(),
                s.getTaxId(),
                s.isActive(),
                s.getCreatedAt(),
                s.getUpdatedAt()
        );
    }
}
