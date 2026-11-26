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
import si.plaan.dto.request.CreateEquipmentRequest;
import si.plaan.dto.request.UpdateEquipmentRequest;
import si.plaan.dto.response.EquipmentResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.entity.*;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.EquipmentRepository;
import si.plaan.repository.OrganizationRepository;
import si.plaan.service.EquipmentService;
import si.plaan.service.MaintenanceWorkOrderService;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Slf4j
@Service
@RequiredArgsConstructor
public class EquipmentServiceImpl implements EquipmentService {

    private static final String EQ_PREFIX = "EQ-";

    private final EquipmentRepository equipmentRepository;
    private final OrganizationRepository organizationRepository;
    private final MaintenanceWorkOrderService maintenanceWorkOrderService;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<EquipmentResponse> getEquipment(
            Long orgId,
            String search,
            EquipmentOperationalStatus operationalStatus,
            EquipmentRecordStatus recordStatus,
            Pageable pageable) {
        requireOrg(orgId);
        Specification<Equipment> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("organization").get("id"), orgId));
            if (operationalStatus != null) {
                predicates.add(cb.equal(root.get("operationalStatus"), operationalStatus));
            }
            if (recordStatus != null) {
                predicates.add(cb.equal(root.get("recordStatus"), recordStatus));
            }
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("equipmentCode")), pattern),
                        cb.like(cb.lower(root.get("equipmentName")), pattern),
                        cb.like(cb.lower(root.get("location")), pattern),
                        cb.like(cb.lower(root.get("manufacturer")), pattern),
                        cb.like(cb.lower(root.get("modelNumber")), pattern),
                        cb.like(cb.lower(root.get("serialNumber")), pattern)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        Page<Equipment> page = equipmentRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(this::mapToResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public EquipmentResponse getById(Long orgId, Long id) {
        requireOrg(orgId);
        return mapToResponse(requireEquipment(orgId, id));
    }

    @Override
    @Transactional(readOnly = true)
    public String getNextEquipmentCode(Long orgId) {
        requireOrg(orgId);
        int max = equipmentRepository.findMaxEquipmentNumberByOrganizationId(orgId);
        return String.format("%s%03d", EQ_PREFIX, max + 1);
    }

    @Override
    @Transactional
    public EquipmentResponse create(Long orgId, CreateEquipmentRequest request) {
        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with id: " + orgId));

        String code = resolveCode(orgId, request.equipmentCode());
        String name = requireName(request.equipmentName());

        Equipment equipment = Equipment.builder()
                .organization(org)
                .equipmentCode(code)
                .equipmentName(name)
                .manufacturer(trimToNull(request.manufacturer()))
                .modelNumber(trimToNull(request.modelNumber()))
                .serialNumber(trimToNull(request.serialNumber()))
                .location(trimToNull(request.location()))
                .installationDate(request.installationDate())
                .description(trimToNull(request.description()))
                .operationalStatus(request.operationalStatus() != null
                        ? request.operationalStatus()
                        : EquipmentOperationalStatus.OPERATIONAL)
                .recordStatus(request.recordStatus() != null
                        ? request.recordStatus()
                        : EquipmentRecordStatus.ACTIVE)
                .build();

        Equipment saved = equipmentRepository.save(equipment);
        log.info("Created equipment {} for org {}", saved.getEquipmentCode(), orgId);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public EquipmentResponse update(Long orgId, Long id, UpdateEquipmentRequest request) {
        requireOrg(orgId);
        Equipment equipment = requireEquipment(orgId, id);

        equipment.setEquipmentName(requireName(request.equipmentName()));
        equipment.setManufacturer(trimToNull(request.manufacturer()));
        equipment.setModelNumber(trimToNull(request.modelNumber()));
        equipment.setSerialNumber(trimToNull(request.serialNumber()));
        equipment.setLocation(trimToNull(request.location()));
        equipment.setInstallationDate(request.installationDate());
        equipment.setDescription(trimToNull(request.description()));
        equipment.setOperationalStatus(request.operationalStatus());
        equipment.setRecordStatus(request.recordStatus());

        Equipment saved = equipmentRepository.save(equipment);
        log.info("Updated equipment {} for org {}", saved.getEquipmentCode(), orgId);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public EquipmentResponse activate(Long orgId, Long id) {
        requireOrg(orgId);
        Equipment equipment = requireEquipment(orgId, id);
        if (equipment.getRecordStatus() == EquipmentRecordStatus.ACTIVE) {
            return mapToResponse(equipment);
        }
        equipment.setRecordStatus(EquipmentRecordStatus.ACTIVE);
        return mapToResponse(equipmentRepository.save(equipment));
    }

    @Override
    @Transactional
    public EquipmentResponse deactivate(Long orgId, Long id) {
        requireOrg(orgId);
        Equipment equipment = requireEquipment(orgId, id);
        if (equipment.getRecordStatus() == EquipmentRecordStatus.INACTIVE) {
            return mapToResponse(equipment);
        }
        if (maintenanceWorkOrderService.hasUnresolvedWorkOrders(orgId, id)) {
            throw new IllegalStateException(
                    "Cannot deactivate equipment while open or in-progress maintenance work orders exist");
        }
        equipment.setRecordStatus(EquipmentRecordStatus.INACTIVE);
        return mapToResponse(equipmentRepository.save(equipment));
    }

    private String resolveCode(Long orgId, String requested) {
        if (requested == null || requested.isBlank()) {
            return getNextEquipmentCode(orgId);
        }
        String code = requested.trim().toUpperCase(Locale.ROOT);
        if (equipmentRepository.existsByOrganizationIdAndEquipmentCodeIgnoreCase(orgId, code)) {
            throw new IllegalArgumentException("Equipment code '" + code + "' already exists in this organization");
        }
        return code;
    }

    private String requireName(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Equipment name is required");
        }
        return name.trim();
    }

    private Equipment requireEquipment(Long orgId, Long id) {
        return equipmentRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Equipment not found with id: " + id));
    }

    private EquipmentResponse mapToResponse(Equipment e) {
        return new EquipmentResponse(
                e.getId(),
                e.getEquipmentCode(),
                e.getEquipmentName(),
                e.getManufacturer(),
                e.getModelNumber(),
                e.getSerialNumber(),
                e.getLocation(),
                e.getInstallationDate(),
                e.getDescription(),
                e.getOperationalStatus(),
                e.getRecordStatus(),
                e.getCreatedAt(),
                e.getUpdatedAt()
        );
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void requireOrg(Long orgId) {
        if (orgId == null) throw new AccessDeniedException("Organization context required");
    }
}
