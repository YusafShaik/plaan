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
import si.plaan.dto.request.IncomingInspectionParameterResultRequest;
import si.plaan.dto.request.UpdateIncomingInspectionRequest;
import si.plaan.dto.response.IncomingInspectionParameterResponse;
import si.plaan.dto.response.IncomingInspectionResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.entity.*;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.IncomingInspectionRepository;
import si.plaan.repository.InspectionTemplateRepository;
import si.plaan.repository.UserRepository;
import si.plaan.service.IncomingInspectionService;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class IncomingInspectionServiceImpl implements IncomingInspectionService {

    private static final String IQC_PREFIX = "IQC-";

    private final IncomingInspectionRepository incomingInspectionRepository;
    private final InspectionTemplateRepository inspectionTemplateRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<IncomingInspectionResponse> getInspections(
            Long orgId, String search, IncomingInspectionStatus status, Pageable pageable) {
        requireOrg(orgId);
        Specification<IncomingInspection> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("organization").get("id"), orgId));
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("inspectionNumber")), pattern),
                        cb.like(cb.lower(root.get("goodsReceipt").get("grnNumber")), pattern),
                        cb.like(cb.lower(root.get("item").get("itemCode")), pattern),
                        cb.like(cb.lower(root.get("item").get("name")), pattern),
                        cb.like(cb.lower(root.get("supplier").get("name")), pattern)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        Page<IncomingInspection> page = incomingInspectionRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(this::mapToResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public IncomingInspectionResponse getById(Long orgId, Long id) {
        requireOrg(orgId);
        return mapToResponse(requireInspection(orgId, id));
    }

    @Override
    @Transactional
    public IncomingInspectionResponse update(
            Long orgId, Long id, Long userId, UpdateIncomingInspectionRequest request) {
        requireOrg(orgId);
        IncomingInspection inspection = requireInspection(orgId, id);
        if (inspection.getStatus() == IncomingInspectionStatus.COMPLETED) {
            throw new IllegalStateException("Completed inspections cannot be edited");
        }

        applyResults(inspection, request, false);
        if (request.complete()) {
            return completeInternal(inspection, userId, request);
        }

        inspection.setStatus(IncomingInspectionStatus.DRAFT);
        return mapToResponse(incomingInspectionRepository.save(inspection));
    }

    @Override
    @Transactional
    public IncomingInspectionResponse complete(
            Long orgId, Long id, Long userId, UpdateIncomingInspectionRequest request) {
        requireOrg(orgId);
        IncomingInspection inspection = requireInspection(orgId, id);
        if (inspection.getStatus() == IncomingInspectionStatus.COMPLETED) {
            throw new IllegalStateException("Inspection " + inspection.getInspectionNumber() + " is already completed");
        }
        applyResults(inspection, request, true);
        return completeInternal(inspection, userId, request);
    }

    @Override
    @Transactional
    public void createPendingFromPostedGrn(Long orgId, GoodsReceipt grn, PurchaseOrder po) {
        requireOrg(orgId);
        Warehouse warehouse = po.getReceivingWarehouse();
        Supplier supplier = po.getSupplier();

        for (GoodsReceiptItem line : grn.getItems()) {
            if (line.getReceivedQuantity() == null
                    || line.getReceivedQuantity().compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            if (incomingInspectionRepository.existsByOrganizationIdAndGoodsReceiptItemId(orgId, line.getId())) {
                continue;
            }

            // Use Optional — do not throw/catch ResourceNotFoundException here; that marks
            // the surrounding GRN post transaction rollback-only.
            Optional<InspectionTemplate> templateOpt = inspectionTemplateRepository
                    .findByOrganizationIdAndItemIdAndInspectionTypeAndStatus(
                            orgId, line.getItem().getId(), InspectionType.INCOMING,
                            InspectionTemplateStatus.ACTIVE);
            if (templateOpt.isEmpty()) {
                continue;
            }
            InspectionTemplate template = templateOpt.get();

            IncomingInspection inspection = IncomingInspection.builder()
                    .organization(grn.getOrganization())
                    .inspectionNumber(nextNumber(orgId))
                    .goodsReceipt(grn)
                    .goodsReceiptItem(line)
                    .item(line.getItem())
                    .warehouse(warehouse)
                    .supplier(supplier)
                    .receivedQuantity(line.getReceivedQuantity())
                    .unitOfMeasure(line.getUnitOfMeasure())
                    .templateId(template.getId())
                    .templateCode(template.getTemplateCode())
                    .templateName(template.getTemplateName())
                    .inspectionDate(LocalDate.now())
                    .status(IncomingInspectionStatus.PENDING)
                    .build();

            int order = 1;
            for (InspectionTemplateParameter param : template.getParameters()) {
                inspection.addParameter(IncomingInspectionParameter.builder()
                        .parameterName(param.getParameterName())
                        .acceptanceCriteria(param.getAcceptanceCriteria())
                        .sortOrder(order++)
                        .build());
            }

            incomingInspectionRepository.save(inspection);
            log.info("Created pending IQC {} for GRN {} item {} qty {}",
                    inspection.getInspectionNumber(), grn.getGrnNumber(),
                    line.getItem().getItemCode(), line.getReceivedQuantity());
        }
    }

    private IncomingInspectionResponse completeInternal(
            IncomingInspection inspection, Long userId, UpdateIncomingInspectionRequest request) {
        validateForCompletion(inspection, request);

        BigDecimal accepted = request.acceptedQuantity().setScale(3, RoundingMode.HALF_UP);
        BigDecimal rejected = inspection.getReceivedQuantity().subtract(accepted).setScale(3, RoundingMode.HALF_UP);

        inspection.setAcceptedQuantity(accepted);
        inspection.setRejectedQuantity(rejected);
        inspection.setInspectionDate(
                request.inspectionDate() != null ? request.inspectionDate() : LocalDate.now());
        inspection.setRemarks(trimToNull(request.remarks()));
        inspection.setStatus(IncomingInspectionStatus.COMPLETED);

        if (userId != null) {
            userRepository.findById(userId).ifPresent(inspection::setInspectedBy);
        }

        IncomingInspection saved = incomingInspectionRepository.save(inspection);
        log.info("Completed IQC {} accepted {} rejected {}",
                saved.getInspectionNumber(), accepted, rejected);
        return mapToResponse(saved);
    }

    private void applyResults(
            IncomingInspection inspection, UpdateIncomingInspectionRequest request, boolean forComplete) {
        if (request.inspectionDate() != null) {
            inspection.setInspectionDate(request.inspectionDate());
        }
        if (request.acceptedQuantity() != null) {
            inspection.setAcceptedQuantity(request.acceptedQuantity().setScale(3, RoundingMode.HALF_UP));
            inspection.setRejectedQuantity(
                    inspection.getReceivedQuantity().subtract(inspection.getAcceptedQuantity())
                            .setScale(3, RoundingMode.HALF_UP));
        }
        if (request.remarks() != null) {
            inspection.setRemarks(trimToNull(request.remarks()));
        }

        if (request.parameterResults() != null && !request.parameterResults().isEmpty()) {
            Map<Long, IncomingInspectionParameter> byId = inspection.getParameters().stream()
                    .collect(Collectors.toMap(IncomingInspectionParameter::getId, Function.identity()));
            for (IncomingInspectionParameterResultRequest r : request.parameterResults()) {
                IncomingInspectionParameter param = byId.get(r.parameterId());
                if (param == null) {
                    throw new IllegalArgumentException("Unknown inspection parameter id: " + r.parameterId());
                }
                param.setResult(r.result());
            }
        }

        if (forComplete) {
            validateForCompletion(inspection, request);
        }
    }

    private void validateForCompletion(
            IncomingInspection inspection, UpdateIncomingInspectionRequest request) {
        if (request.acceptedQuantity() == null) {
            throw new IllegalArgumentException("Accepted quantity is required");
        }
        BigDecimal accepted = request.acceptedQuantity().setScale(3, RoundingMode.HALF_UP);
        if (accepted.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Accepted quantity cannot be negative");
        }
        if (accepted.compareTo(inspection.getReceivedQuantity()) > 0) {
            throw new IllegalArgumentException("Accepted quantity cannot exceed received quantity");
        }
        BigDecimal rejected = inspection.getReceivedQuantity().subtract(accepted);

        for (IncomingInspectionParameter param : inspection.getParameters()) {
            if (param.getResult() == null) {
                throw new IllegalArgumentException(
                        "All inspection parameters must have Pass or Fail before completion");
            }
        }

        boolean anyFail = inspection.getParameters().stream()
                .anyMatch(p -> p.getResult() == InspectionParameterResult.FAIL);
        String remarks = request.remarks() != null ? request.remarks().trim() : "";
        if ((rejected.compareTo(BigDecimal.ZERO) > 0 || anyFail) && remarks.isEmpty()) {
            throw new IllegalArgumentException(
                    "Inspection remarks are required when quantity is rejected or a parameter fails");
        }
    }

    private String nextNumber(Long orgId) {
        int max = incomingInspectionRepository.findMaxInspectionNumberByOrganizationId(orgId);
        return String.format("%s%03d", IQC_PREFIX, max + 1);
    }

    private IncomingInspection requireInspection(Long orgId, Long id) {
        return incomingInspectionRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Incoming inspection not found with id: " + id));
    }

    private IncomingInspectionResponse mapToResponse(IncomingInspection i) {
        List<IncomingInspectionParameterResponse> params = i.getParameters().stream()
                .map(p -> new IncomingInspectionParameterResponse(
                        p.getId(), p.getParameterName(), p.getAcceptanceCriteria(),
                        p.getResult(), p.getSortOrder()))
                .toList();
        return new IncomingInspectionResponse(
                i.getId(),
                i.getInspectionNumber(),
                i.getGoodsReceipt().getId(),
                i.getGoodsReceipt().getGrnNumber(),
                i.getGoodsReceiptItem().getId(),
                i.getSupplier().getId(),
                i.getSupplier().getSupplierCode(),
                i.getSupplier().getName(),
                i.getItem().getId(),
                i.getItem().getItemCode(),
                i.getItem().getName(),
                i.getWarehouse().getId(),
                i.getWarehouse().getWarehouseCode(),
                i.getWarehouse().getName(),
                i.getReceivedQuantity(),
                i.getUnitOfMeasure(),
                i.getTemplateId(),
                i.getTemplateCode(),
                i.getTemplateName(),
                i.getInspectionDate(),
                i.getAcceptedQuantity(),
                i.getRejectedQuantity(),
                i.getRemarks(),
                i.getInspectedBy() != null ? i.getInspectedBy().getId() : null,
                i.getInspectedBy() != null ? i.getInspectedBy().getFullName() : null,
                i.getStatus(),
                params,
                i.getCreatedAt(),
                i.getUpdatedAt()
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
