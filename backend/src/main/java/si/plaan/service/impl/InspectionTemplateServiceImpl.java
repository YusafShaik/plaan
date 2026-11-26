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
import si.plaan.dto.request.CreateInspectionTemplateRequest;
import si.plaan.dto.request.InspectionTemplateParameterRequest;
import si.plaan.dto.request.UpdateInspectionTemplateRequest;
import si.plaan.dto.response.InspectionTemplateParameterResponse;
import si.plaan.dto.response.InspectionTemplateResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.entity.*;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.InspectionTemplateRepository;
import si.plaan.repository.ItemRepository;
import si.plaan.repository.OrganizationRepository;
import si.plaan.service.InspectionTemplateService;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class InspectionTemplateServiceImpl implements InspectionTemplateService {

    private static final String QT_PREFIX = "QT-";

    private final InspectionTemplateRepository inspectionTemplateRepository;
    private final ItemRepository itemRepository;
    private final OrganizationRepository organizationRepository;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<InspectionTemplateResponse> getTemplates(
            Long orgId,
            String search,
            InspectionTemplateStatus status,
            InspectionType inspectionType,
            Pageable pageable) {
        requireOrg(orgId);

        Specification<InspectionTemplate> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("organization").get("id"), orgId));
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (inspectionType != null) {
                predicates.add(cb.equal(root.get("inspectionType"), inspectionType));
            }
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("templateCode")), pattern),
                        cb.like(cb.lower(root.get("templateName")), pattern),
                        cb.like(cb.lower(root.get("item").get("itemCode")), pattern),
                        cb.like(cb.lower(root.get("item").get("name")), pattern)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<InspectionTemplate> page = inspectionTemplateRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(this::mapToResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public InspectionTemplateResponse getById(Long orgId, Long id) {
        requireOrg(orgId);
        return mapToResponse(requireTemplate(orgId, id));
    }

    @Override
    @Transactional(readOnly = true)
    public String getNextTemplateCode(Long orgId) {
        requireOrg(orgId);
        int max = inspectionTemplateRepository.findMaxTemplateNumberByOrganizationId(orgId);
        return String.format("%s%03d", QT_PREFIX, max + 1);
    }

    @Override
    @Transactional
    public InspectionTemplateResponse create(Long orgId, CreateInspectionTemplateRequest request) {
        requireOrg(orgId);
        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with id: " + orgId));

        Item item = requireActiveItem(orgId, request.itemId());
        String code = resolveCode(orgId, request.templateCode());
        List<InspectionTemplateParameterRequest> parameters = request.parameters() != null
                ? request.parameters() : List.of();

        InspectionTemplateStatus target = request.activate()
                ? InspectionTemplateStatus.ACTIVE
                : InspectionTemplateStatus.DRAFT;
        if (target == InspectionTemplateStatus.ACTIVE) {
            validateCanActivate(orgId, item.getId(), request.inspectionType(), null, parameters);
        }

        InspectionTemplate template = InspectionTemplate.builder()
                .organization(org)
                .templateCode(code)
                .templateName(request.templateName().trim())
                .item(item)
                .inspectionType(request.inspectionType())
                .notes(trimToNull(request.notes()))
                .status(target)
                .build();

        attachParameters(template, parameters);

        InspectionTemplate saved = inspectionTemplateRepository.save(template);
        log.info("Created inspection template {} status {} for org {}",
                saved.getTemplateCode(), saved.getStatus(), orgId);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public InspectionTemplateResponse update(Long orgId, Long id, UpdateInspectionTemplateRequest request) {
        requireOrg(orgId);
        InspectionTemplate template = requireTemplate(orgId, id);

        if (template.getStatus() == InspectionTemplateStatus.INACTIVE) {
            throw new IllegalStateException(
                    "Inactive templates cannot be edited. Create a new draft template instead.");
        }
        if (template.getStatus() == InspectionTemplateStatus.ACTIVE && !request.activate()) {
            throw new IllegalStateException(
                    "Active templates cannot be modified. Deactivate first or create a replacement draft.");
        }

        Item item = requireActiveItem(orgId, request.itemId());
        List<InspectionTemplateParameterRequest> parameters = request.parameters() != null
                ? request.parameters() : List.of();

        if (request.activate() || template.getStatus() == InspectionTemplateStatus.ACTIVE) {
            validateCanActivate(orgId, item.getId(), request.inspectionType(), id, parameters);
        }

        template.setTemplateName(request.templateName().trim());
        template.setItem(item);
        template.setInspectionType(request.inspectionType());
        template.setNotes(trimToNull(request.notes()));
        template.clearParameters();
        attachParameters(template, parameters);

        if (request.activate()) {
            template.setStatus(InspectionTemplateStatus.ACTIVE);
        }

        InspectionTemplate saved = inspectionTemplateRepository.save(template);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public InspectionTemplateResponse activate(Long orgId, Long id) {
        requireOrg(orgId);
        InspectionTemplate template = requireTemplate(orgId, id);

        if (template.getStatus() == InspectionTemplateStatus.ACTIVE) {
            throw new IllegalStateException("Template " + template.getTemplateCode() + " is already active");
        }
        if (template.getStatus() == InspectionTemplateStatus.INACTIVE) {
            throw new IllegalStateException("Inactive templates cannot be reactivated. Create a new draft instead.");
        }

        List<InspectionTemplateParameterRequest> params = template.getParameters().stream()
                .map(p -> new InspectionTemplateParameterRequest(p.getParameterName(), p.getAcceptanceCriteria()))
                .toList();
        validateCanActivate(orgId, template.getItem().getId(), template.getInspectionType(), id, params);

        template.setStatus(InspectionTemplateStatus.ACTIVE);
        InspectionTemplate saved = inspectionTemplateRepository.save(template);
        log.info("Activated inspection template {} for org {}", saved.getTemplateCode(), orgId);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public InspectionTemplateResponse deactivate(Long orgId, Long id) {
        requireOrg(orgId);
        InspectionTemplate template = requireTemplate(orgId, id);

        if (template.getStatus() != InspectionTemplateStatus.ACTIVE) {
            throw new IllegalStateException("Only active templates can be deactivated");
        }

        template.setStatus(InspectionTemplateStatus.INACTIVE);
        InspectionTemplate saved = inspectionTemplateRepository.save(template);
        log.info("Deactivated inspection template {} for org {}", saved.getTemplateCode(), orgId);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public void deleteDraft(Long orgId, Long id) {
        requireOrg(orgId);
        InspectionTemplate template = requireTemplate(orgId, id);
        if (template.getStatus() != InspectionTemplateStatus.DRAFT) {
            throw new IllegalStateException(
                    "Only draft templates can be deleted. Active/inactive templates are preserved for history.");
        }
        inspectionTemplateRepository.delete(template);
    }

    @Override
    @Transactional(readOnly = true)
    public InspectionTemplateResponse getActiveForItemAndType(
            Long orgId, Long itemId, InspectionType inspectionType) {
        requireOrg(orgId);
        InspectionTemplate template = inspectionTemplateRepository
                .findByOrganizationIdAndItemIdAndInspectionTypeAndStatus(
                        orgId, itemId, inspectionType, InspectionTemplateStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No active inspection template for item " + itemId + " and type " + inspectionType));
        return mapToResponse(template);
    }

    private void validateCanActivate(
            Long orgId,
            Long itemId,
            InspectionType type,
            Long excludeId,
            List<InspectionTemplateParameterRequest> parameters) {
        if (parameters == null || parameters.isEmpty()) {
            throw new IllegalArgumentException("At least one inspection parameter is required to activate a template");
        }
        validateParameterNames(parameters);

        boolean exists = excludeId == null
                ? inspectionTemplateRepository.existsByOrganizationIdAndItemIdAndInspectionTypeAndStatus(
                        orgId, itemId, type, InspectionTemplateStatus.ACTIVE)
                : inspectionTemplateRepository.existsByOrganizationIdAndItemIdAndInspectionTypeAndStatusAndIdNot(
                        orgId, itemId, type, InspectionTemplateStatus.ACTIVE, excludeId);
        if (exists) {
            throw new IllegalStateException(
                    "An active template already exists for this item and inspection type. "
                            + "Deactivate it before activating another.");
        }
    }

    private void validateParameterNames(List<InspectionTemplateParameterRequest> parameters) {
        Set<String> names = new HashSet<>();
        for (InspectionTemplateParameterRequest p : parameters) {
            if (p.parameterName() == null || p.parameterName().isBlank()) {
                throw new IllegalArgumentException("Parameter name is required");
            }
            if (p.acceptanceCriteria() == null || p.acceptanceCriteria().isBlank()) {
                throw new IllegalArgumentException("Acceptance criteria is required");
            }
            String key = p.parameterName().trim().toLowerCase(Locale.ROOT);
            if (!names.add(key)) {
                throw new IllegalArgumentException(
                        "Duplicate parameter name within template: " + p.parameterName().trim());
            }
        }
    }

    private void attachParameters(
            InspectionTemplate template, List<InspectionTemplateParameterRequest> parameters) {
        if (parameters == null || parameters.isEmpty()) {
            return;
        }
        validateParameterNames(parameters);
        int order = 1;
        for (InspectionTemplateParameterRequest req : parameters) {
            template.addParameter(InspectionTemplateParameter.builder()
                    .parameterName(req.parameterName().trim())
                    .acceptanceCriteria(req.acceptanceCriteria().trim())
                    .sortOrder(order++)
                    .build());
        }
    }

    private String resolveCode(Long orgId, String requested) {
        if (requested == null || requested.isBlank() || requested.startsWith("QT-...")) {
            return getNextTemplateCode(orgId);
        }
        String code = requested.trim().toUpperCase(Locale.ROOT);
        if (inspectionTemplateRepository.existsByOrganizationIdAndTemplateCodeIgnoreCase(orgId, code)) {
            throw new IllegalArgumentException("Template code '" + code + "' already exists in this organization");
        }
        return code;
    }

    private Item requireActiveItem(Long orgId, Long itemId) {
        Item item = itemRepository.findByIdAndOrganizationId(itemId, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Item not found with id: " + itemId));
        if (!item.isActive()) {
            throw new IllegalArgumentException("Only active items can be selected for inspection templates");
        }
        return item;
    }

    private InspectionTemplate requireTemplate(Long orgId, Long id) {
        return inspectionTemplateRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Inspection template not found with id: " + id));
    }

    private InspectionTemplateResponse mapToResponse(InspectionTemplate template) {
        List<InspectionTemplateParameterResponse> params = template.getParameters().stream()
                .map(p -> new InspectionTemplateParameterResponse(
                        p.getId(),
                        p.getParameterName(),
                        p.getAcceptanceCriteria(),
                        p.getSortOrder()))
                .toList();
        return new InspectionTemplateResponse(
                template.getId(),
                template.getTemplateCode(),
                template.getTemplateName(),
                template.getItem().getId(),
                template.getItem().getItemCode(),
                template.getItem().getName(),
                template.getInspectionType(),
                template.getStatus(),
                template.getNotes(),
                params.size(),
                params,
                template.getCreatedAt(),
                template.getUpdatedAt()
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
