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
import si.plaan.dto.request.FinishedGoodsInspectionParameterResultRequest;
import si.plaan.dto.request.UpdateFinishedGoodsInspectionRequest;
import si.plaan.dto.response.FinishedGoodsInspectionParameterResponse;
import si.plaan.dto.response.FinishedGoodsInspectionResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.entity.*;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.FinishedGoodsInspectionRepository;
import si.plaan.repository.InspectionTemplateRepository;
import si.plaan.repository.UserRepository;
import si.plaan.service.FinishedGoodsInspectionService;

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
public class FinishedGoodsInspectionServiceImpl implements FinishedGoodsInspectionService {

    private static final String FGI_PREFIX = "FGI-";
    private static final int QTY_SCALE = 4;

    private final FinishedGoodsInspectionRepository finishedGoodsInspectionRepository;
    private final InspectionTemplateRepository inspectionTemplateRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<FinishedGoodsInspectionResponse> getInspections(
            Long orgId, String search, FinishedGoodsInspectionStatus status, Pageable pageable) {
        requireOrg(orgId);
        Specification<FinishedGoodsInspection> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("organization").get("id"), orgId));
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("inspectionNumber")), pattern),
                        cb.like(cb.lower(root.get("productionOrder").get("orderNumber")), pattern),
                        cb.like(cb.lower(root.get("productionReceipt").get("receiptNumber")), pattern),
                        cb.like(cb.lower(root.get("item").get("itemCode")), pattern),
                        cb.like(cb.lower(root.get("item").get("name")), pattern)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        Page<FinishedGoodsInspection> page = finishedGoodsInspectionRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(this::mapToResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public FinishedGoodsInspectionResponse getById(Long orgId, Long id) {
        requireOrg(orgId);
        return mapToResponse(requireInspection(orgId, id));
    }

    @Override
    @Transactional
    public FinishedGoodsInspectionResponse update(
            Long orgId, Long id, Long userId, UpdateFinishedGoodsInspectionRequest request) {
        requireOrg(orgId);
        FinishedGoodsInspection inspection = requireInspection(orgId, id);
        if (inspection.getStatus() == FinishedGoodsInspectionStatus.COMPLETED) {
            throw new IllegalStateException("Completed inspections cannot be edited");
        }

        applyResults(inspection, request, false);
        if (request.complete()) {
            return completeInternal(inspection, userId, request);
        }

        inspection.setStatus(FinishedGoodsInspectionStatus.DRAFT);
        return mapToResponse(finishedGoodsInspectionRepository.save(inspection));
    }

    @Override
    @Transactional
    public FinishedGoodsInspectionResponse complete(
            Long orgId, Long id, Long userId, UpdateFinishedGoodsInspectionRequest request) {
        requireOrg(orgId);
        FinishedGoodsInspection inspection = requireInspection(orgId, id);
        if (inspection.getStatus() == FinishedGoodsInspectionStatus.COMPLETED) {
            throw new IllegalStateException("Inspection " + inspection.getInspectionNumber() + " is already completed");
        }
        applyResults(inspection, request, true);
        return completeInternal(inspection, userId, request);
    }

    @Override
    @Transactional
    public void createPendingFromPostedReceipt(Long orgId, ProductionReceipt receipt, ProductionOrder order) {
        requireOrg(orgId);
        if (receipt.getReceiptQuantity() == null
                || receipt.getReceiptQuantity().compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        if (finishedGoodsInspectionRepository.existsByOrganizationIdAndProductionReceiptId(orgId, receipt.getId())) {
            return;
        }

        // Optional lookup — do not throw/catch ResourceNotFoundException (marks TX rollback-only).
        Optional<InspectionTemplate> templateOpt = inspectionTemplateRepository
                .findByOrganizationIdAndItemIdAndInspectionTypeAndStatus(
                        orgId, receipt.getProduct().getId(), InspectionType.FINISHED_GOODS,
                        InspectionTemplateStatus.ACTIVE);
        if (templateOpt.isEmpty()) {
            return;
        }
        InspectionTemplate template = templateOpt.get();

        FinishedGoodsInspection inspection = FinishedGoodsInspection.builder()
                .organization(receipt.getOrganization())
                .inspectionNumber(nextNumber(orgId))
                .productionOrder(order)
                .productionReceipt(receipt)
                .item(receipt.getProduct())
                .warehouse(receipt.getReceivingWarehouse())
                .receivedQuantity(receipt.getReceiptQuantity())
                .unitOfMeasure(receipt.getUnitOfMeasure())
                .templateId(template.getId())
                .templateCode(template.getTemplateCode())
                .templateName(template.getTemplateName())
                .inspectionDate(LocalDate.now())
                .status(FinishedGoodsInspectionStatus.PENDING)
                .build();

        int sort = 1;
        for (InspectionTemplateParameter param : template.getParameters()) {
            inspection.addParameter(FinishedGoodsInspectionParameter.builder()
                    .parameterName(param.getParameterName())
                    .acceptanceCriteria(param.getAcceptanceCriteria())
                    .sortOrder(sort++)
                    .build());
        }

        finishedGoodsInspectionRepository.save(inspection);
        log.info("Created pending FGI {} for production receipt {} product {} qty {}",
                inspection.getInspectionNumber(), receipt.getReceiptNumber(),
                receipt.getProduct().getItemCode(), receipt.getReceiptQuantity());
    }

    @Override
    @Transactional(readOnly = true)
    public boolean hasIncompleteInspections(Long orgId, Long productionOrderId) {
        return finishedGoodsInspectionRepository.existsByOrganizationIdAndProductionOrderIdAndStatusIn(
                orgId, productionOrderId,
                List.of(FinishedGoodsInspectionStatus.PENDING, FinishedGoodsInspectionStatus.DRAFT));
    }

    @Override
    @Transactional(readOnly = true)
    public long countIncompleteInspections(Long orgId, Long productionOrderId) {
        return finishedGoodsInspectionRepository.countByOrganizationIdAndProductionOrderIdAndStatusIn(
                orgId, productionOrderId,
                List.of(FinishedGoodsInspectionStatus.PENDING, FinishedGoodsInspectionStatus.DRAFT));
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal[] getQualityTotals(Long orgId, Long productionOrderId) {
        List<Object[]> rows = finishedGoodsInspectionRepository.sumQualityByProductionOrder(orgId, productionOrderId);
        if (rows == null || rows.isEmpty() || rows.get(0) == null) {
            return new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO};
        }
        Object[] values = rows.get(0);
        return new BigDecimal[]{
                toBd(values.length > 0 ? values[0] : null),
                toBd(values.length > 1 ? values[1] : null),
                toBd(values.length > 2 ? values[2] : null)
        };
    }

    private FinishedGoodsInspectionResponse completeInternal(
            FinishedGoodsInspection inspection, Long userId, UpdateFinishedGoodsInspectionRequest request) {
        validateForCompletion(inspection, request);

        BigDecimal accepted = request.acceptedQuantity().setScale(QTY_SCALE, RoundingMode.HALF_UP);
        BigDecimal rejected = inspection.getReceivedQuantity().subtract(accepted).setScale(QTY_SCALE, RoundingMode.HALF_UP);

        inspection.setAcceptedQuantity(accepted);
        inspection.setRejectedQuantity(rejected);
        inspection.setInspectionDate(
                request.inspectionDate() != null ? request.inspectionDate() : LocalDate.now());
        inspection.setRemarks(trimToNull(request.remarks()));
        inspection.setStatus(FinishedGoodsInspectionStatus.COMPLETED);

        if (userId != null) {
            userRepository.findById(userId).ifPresent(inspection::setInspectedBy);
        }

        FinishedGoodsInspection saved = finishedGoodsInspectionRepository.save(inspection);
        log.info("Completed FGI {} accepted {} rejected {}",
                saved.getInspectionNumber(), accepted, rejected);
        return mapToResponse(saved);
    }

    private void applyResults(
            FinishedGoodsInspection inspection, UpdateFinishedGoodsInspectionRequest request, boolean forComplete) {
        if (request.inspectionDate() != null) {
            inspection.setInspectionDate(request.inspectionDate());
        }
        if (request.acceptedQuantity() != null) {
            inspection.setAcceptedQuantity(request.acceptedQuantity().setScale(QTY_SCALE, RoundingMode.HALF_UP));
            inspection.setRejectedQuantity(
                    inspection.getReceivedQuantity().subtract(inspection.getAcceptedQuantity())
                            .setScale(QTY_SCALE, RoundingMode.HALF_UP));
        }
        if (request.remarks() != null) {
            inspection.setRemarks(trimToNull(request.remarks()));
        }

        if (request.parameterResults() != null && !request.parameterResults().isEmpty()) {
            Map<Long, FinishedGoodsInspectionParameter> byId = inspection.getParameters().stream()
                    .collect(Collectors.toMap(FinishedGoodsInspectionParameter::getId, Function.identity()));
            for (FinishedGoodsInspectionParameterResultRequest r : request.parameterResults()) {
                FinishedGoodsInspectionParameter param = byId.get(r.parameterId());
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
            FinishedGoodsInspection inspection, UpdateFinishedGoodsInspectionRequest request) {
        if (request.acceptedQuantity() == null) {
            throw new IllegalArgumentException("Accepted quantity is required");
        }
        BigDecimal accepted = request.acceptedQuantity().setScale(QTY_SCALE, RoundingMode.HALF_UP);
        if (accepted.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Accepted quantity cannot be negative");
        }
        if (accepted.compareTo(inspection.getReceivedQuantity()) > 0) {
            throw new IllegalArgumentException("Accepted quantity cannot exceed received quantity");
        }
        BigDecimal rejected = inspection.getReceivedQuantity().subtract(accepted);

        for (FinishedGoodsInspectionParameter param : inspection.getParameters()) {
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
        int max = finishedGoodsInspectionRepository.findMaxInspectionNumberByOrganizationId(orgId);
        return String.format("%s%03d", FGI_PREFIX, max + 1);
    }

    private FinishedGoodsInspection requireInspection(Long orgId, Long id) {
        return finishedGoodsInspectionRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Finished goods inspection not found with id: " + id));
    }

    private FinishedGoodsInspectionResponse mapToResponse(FinishedGoodsInspection i) {
        List<FinishedGoodsInspectionParameterResponse> params = i.getParameters().stream()
                .map(p -> new FinishedGoodsInspectionParameterResponse(
                        p.getId(), p.getParameterName(), p.getAcceptanceCriteria(),
                        p.getResult(), p.getSortOrder()))
                .toList();
        return new FinishedGoodsInspectionResponse(
                i.getId(),
                i.getInspectionNumber(),
                i.getProductionOrder().getId(),
                i.getProductionOrder().getOrderNumber(),
                i.getProductionReceipt().getId(),
                i.getProductionReceipt().getReceiptNumber(),
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

    private static BigDecimal toBd(Object value) {
        if (value == null) return BigDecimal.ZERO;
        if (value instanceof BigDecimal bd) return bd;
        return new BigDecimal(value.toString());
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
