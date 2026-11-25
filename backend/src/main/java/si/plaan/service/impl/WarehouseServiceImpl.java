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
import si.plaan.dto.request.CreateWarehouseRequest;
import si.plaan.dto.request.UpdateWarehouseRequest;
import si.plaan.dto.response.PageResponse;
import si.plaan.dto.response.WarehouseResponse;
import si.plaan.dto.response.WarehouseSummaryResponse;
import si.plaan.entity.Organization;
import si.plaan.entity.Warehouse;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.OrganizationRepository;
import si.plaan.repository.WarehouseRepository;
import si.plaan.service.WarehouseService;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class WarehouseServiceImpl implements WarehouseService {

    private final WarehouseRepository warehouseRepository;
    private final OrganizationRepository organizationRepository;

    private static final String WAREHOUSE_PREFIX = "WH-";

    @Override
    @Transactional(readOnly = true)
    public PageResponse<WarehouseResponse> getWarehouses(Long orgId, String search, Boolean active, Pageable pageable) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        Specification<Warehouse> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("organization").get("id"), orgId));

            if (active != null) {
                predicates.add(cb.equal(root.get("active"), active));
            }

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                Predicate nameLike = cb.like(cb.lower(root.get("name")), pattern);
                Predicate codeLike = cb.like(cb.lower(root.get("warehouseCode")), pattern);
                Predicate addrLike = cb.like(cb.lower(root.get("address")), pattern);
                Predicate descLike = cb.like(cb.lower(root.get("description")), pattern);
                predicates.add(cb.or(nameLike, codeLike, addrLike, descLike));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Warehouse> page = warehouseRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(this::mapToResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public WarehouseResponse getWarehouseById(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        Warehouse warehouse = warehouseRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse not found with id: " + id));
        return mapToResponse(warehouse);
    }

    @Override
    @Transactional(readOnly = true)
    public WarehouseSummaryResponse getSummary(Long orgId) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        long total = warehouseRepository.countByOrganizationId(orgId);
        long active = warehouseRepository.countByOrganizationIdAndActive(orgId, true);
        long inactive = total - active;
        return new WarehouseSummaryResponse(total, active, inactive);
    }

    @Override
    @Transactional(readOnly = true)
    public String getNextWarehouseCode(Long orgId) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        int maxNum = warehouseRepository.findMaxWarehouseNumberByOrganizationId(orgId);
        return String.format("%s%03d", WAREHOUSE_PREFIX, maxNum + 1);
    }

    @Override
    @Transactional
    public WarehouseResponse createWarehouse(Long orgId, CreateWarehouseRequest request) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        String finalCode;
        if (request.warehouseCode() != null && !request.warehouseCode().trim().isBlank()) {
            finalCode = request.warehouseCode().trim().toUpperCase();
        } else {
            finalCode = getNextWarehouseCode(orgId);
        }

        if (warehouseRepository.existsByOrganizationIdAndWarehouseCodeIgnoreCase(orgId, finalCode)) {
            throw new IllegalArgumentException("Warehouse code '" + finalCode + "' is already registered in this organization");
        }

        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with id: " + orgId));

        Warehouse warehouse = Warehouse.builder()
                .organization(org)
                .warehouseCode(finalCode)
                .name(request.name().trim())
                .address(request.address() != null && !request.address().isBlank() ? request.address().trim() : null)
                .description(request.description() != null && !request.description().isBlank() ? request.description().trim() : null)
                .active(request.active() == null || request.active())
                .build();

        Warehouse saved = warehouseRepository.save(warehouse);
        log.info("Warehouse created: id={}, code={}, name={}, orgId={}", saved.getId(), saved.getWarehouseCode(), saved.getName(), orgId);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public WarehouseResponse updateWarehouse(Long orgId, Long id, UpdateWarehouseRequest request) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        Warehouse warehouse = warehouseRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse not found with id: " + id));

        warehouse.setName(request.name().trim());
        warehouse.setAddress(request.address() != null && !request.address().isBlank() ? request.address().trim() : null);
        warehouse.setDescription(request.description() != null && !request.description().isBlank() ? request.description().trim() : null);
        if (request.active() != null) {
            warehouse.setActive(request.active());
        }

        Warehouse saved = warehouseRepository.save(warehouse);
        log.info("Warehouse updated: id={}, code={}, orgId={}", saved.getId(), saved.getWarehouseCode(), orgId);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public WarehouseResponse toggleStatus(Long orgId, Long id) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        Warehouse warehouse = warehouseRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Warehouse not found with id: " + id));

        warehouse.setActive(!warehouse.isActive());
        Warehouse saved = warehouseRepository.save(warehouse);
        log.info("Warehouse status toggled: id={}, code={}, active={}", saved.getId(), saved.getWarehouseCode(), saved.isActive());
        return mapToResponse(saved);
    }

    private WarehouseResponse mapToResponse(Warehouse w) {
        return new WarehouseResponse(
                w.getId(),
                w.getWarehouseCode(),
                w.getName(),
                w.getAddress(),
                w.getDescription(),
                w.isActive(),
                w.getCreatedAt(),
                w.getUpdatedAt()
        );
    }
}
