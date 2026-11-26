package si.plaan.service.impl;

import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.request.CreateSupplierPaymentRequest;
import si.plaan.dto.request.UpdateSupplierPaymentRequest;
import si.plaan.dto.response.*;
import si.plaan.entity.*;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.OrganizationRepository;
import si.plaan.repository.PurchaseInvoiceRepository;
import si.plaan.repository.SupplierPaymentRepository;
import si.plaan.service.SupplierPaymentService;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SupplierPaymentServiceImpl implements SupplierPaymentService {

    private final SupplierPaymentRepository supplierPaymentRepository;
    private final PurchaseInvoiceRepository purchaseInvoiceRepository;
    private final OrganizationRepository organizationRepository;

    private static final String PAY_PREFIX = "PAY-";

    @Override
    @Transactional(readOnly = true)
    public PageResponse<SupplierPaymentResponse> getPayments(
            Long orgId,
            String search,
            SupplierPaymentStatus status,
            Pageable pageable) {
        requireOrg(orgId);

        Specification<SupplierPayment> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("organization").get("id"), orgId));
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("paymentNumber")), pattern),
                        cb.like(cb.lower(root.get("purchaseInvoice").get("invoiceNumber")), pattern),
                        cb.like(cb.lower(root.get("supplier").get("name")), pattern),
                        cb.like(cb.lower(root.get("paymentReference")), pattern)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<SupplierPayment> page = supplierPaymentRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(this::mapToResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public SupplierPaymentResponse getPaymentById(Long orgId, Long id) {
        requireOrg(orgId);
        SupplierPayment payment = supplierPaymentRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier payment not found with id: " + id));
        return mapToResponse(payment);
    }

    @Override
    @Transactional(readOnly = true)
    public String getNextPaymentNumber(Long orgId) {
        requireOrg(orgId);
        int maxNum = supplierPaymentRepository.findMaxPaymentNumberByOrganizationId(orgId);
        return String.format("%s%03d", PAY_PREFIX, maxNum + 1);
    }

    @Override
    @Transactional(readOnly = true)
    public List<EligiblePurchaseInvoiceResponse> getEligibleInvoices(Long orgId) {
        requireOrg(orgId);

        Specification<PurchaseInvoice> spec = (root, query, cb) -> cb.and(
                cb.equal(root.get("organization").get("id"), orgId),
                cb.equal(root.get("status"), PurchaseInvoiceStatus.POSTED),
                cb.greaterThan(root.get("outstandingAmount"), BigDecimal.ZERO)
        );

        return purchaseInvoiceRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream()
                .map(this::mapToEligibleInvoice)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public EligiblePurchaseInvoiceResponse getInvoiceDetailsForPayment(Long orgId, Long invoiceId) {
        requireOrg(orgId);
        PurchaseInvoice invoice = purchaseInvoiceRepository.findByIdAndOrganizationId(invoiceId, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase invoice not found with id: " + invoiceId));
        validateEligibleInvoice(invoice);
        return mapToEligibleInvoice(invoice);
    }

    @Override
    @Transactional
    public SupplierPaymentResponse createPayment(Long orgId, CreateSupplierPaymentRequest request) {
        requireOrg(orgId);

        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with id: " + orgId));

        PurchaseInvoice invoice = purchaseInvoiceRepository.findByIdAndOrganizationId(request.purchaseInvoiceId(), orgId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Purchase invoice not found with id: " + request.purchaseInvoiceId()));

        validateEligibleInvoice(invoice);

        BigDecimal amount = request.amount().setScale(2, RoundingMode.HALF_UP);
        validateAmount(amount, invoice.getOutstandingAmount());

        String paymentNumber;
        if (request.paymentNumber() != null && !request.paymentNumber().isBlank()) {
            paymentNumber = request.paymentNumber().trim().toUpperCase();
        } else {
            paymentNumber = getNextPaymentNumber(orgId);
        }
        if (supplierPaymentRepository.existsByOrganizationIdAndPaymentNumberIgnoreCase(orgId, paymentNumber)) {
            throw new IllegalArgumentException(
                    "Payment number '" + paymentNumber + "' already exists in this organization");
        }

        SupplierPaymentStatus targetStatus =
                request.status() != null ? request.status() : SupplierPaymentStatus.DRAFT;

        SupplierPayment payment = SupplierPayment.builder()
                .organization(org)
                .paymentNumber(paymentNumber)
                .paymentDate(request.paymentDate())
                .purchaseInvoice(invoice)
                .supplier(invoice.getSupplier())
                .amount(amount)
                .paymentMethod(request.paymentMethod())
                .paymentReference(trimToNull(request.paymentReference()))
                .notes(trimToNull(request.notes()))
                .status(SupplierPaymentStatus.DRAFT)
                .build();

        SupplierPayment saved = supplierPaymentRepository.save(payment);

        if (targetStatus == SupplierPaymentStatus.POSTED) {
            return applyPost(orgId, saved);
        }

        log.info("Created draft supplier payment {} for invoice {}", saved.getPaymentNumber(), invoice.getInvoiceNumber());
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public SupplierPaymentResponse updatePayment(Long orgId, Long id, UpdateSupplierPaymentRequest request) {
        requireOrg(orgId);

        SupplierPayment payment = supplierPaymentRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier payment not found with id: " + id));

        if (payment.getStatus() == SupplierPaymentStatus.POSTED) {
            throw new IllegalStateException("Cannot edit a posted supplier payment");
        }

        PurchaseInvoice invoice = purchaseInvoiceRepository.findByIdAndOrganizationId(
                        payment.getPurchaseInvoice().getId(), orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase invoice not found"));

        validateEligibleInvoice(invoice);

        BigDecimal amount = request.amount().setScale(2, RoundingMode.HALF_UP);
        validateAmount(amount, invoice.getOutstandingAmount());

        payment.setPaymentDate(request.paymentDate());
        payment.setAmount(amount);
        payment.setPaymentMethod(request.paymentMethod());
        payment.setPaymentReference(trimToNull(request.paymentReference()));
        payment.setNotes(trimToNull(request.notes()));

        SupplierPaymentStatus targetStatus =
                request.status() != null ? request.status() : payment.getStatus();

        SupplierPayment saved = supplierPaymentRepository.save(payment);

        if (targetStatus == SupplierPaymentStatus.POSTED) {
            return applyPost(orgId, saved);
        }

        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public SupplierPaymentResponse postPayment(Long orgId, Long id) {
        requireOrg(orgId);
        SupplierPayment payment = supplierPaymentRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier payment not found with id: " + id));
        return applyPost(orgId, payment);
    }

    @Override
    @Transactional
    public void deletePayment(Long orgId, Long id) {
        requireOrg(orgId);
        SupplierPayment payment = supplierPaymentRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier payment not found with id: " + id));
        if (payment.getStatus() == SupplierPaymentStatus.POSTED) {
            throw new IllegalStateException("Cannot delete a posted supplier payment");
        }
        supplierPaymentRepository.delete(payment);
        log.info("Deleted draft supplier payment {} for org {}", payment.getPaymentNumber(), orgId);
    }

    private SupplierPaymentResponse applyPost(Long orgId, SupplierPayment payment) {
        if (payment.getStatus() == SupplierPaymentStatus.POSTED) {
            throw new IllegalStateException("Payment " + payment.getPaymentNumber() + " is already posted");
        }

        // Re-load invoice for optimistic locking / fresh outstanding
        PurchaseInvoice invoice = purchaseInvoiceRepository.findByIdAndOrganizationId(
                        payment.getPurchaseInvoice().getId(), orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase invoice not found"));

        validateEligibleInvoice(invoice);
        validateAmount(payment.getAmount(), invoice.getOutstandingAmount());

        BigDecimal newPaid = invoice.getPaidAmount().add(payment.getAmount()).setScale(2, RoundingMode.HALF_UP);
        BigDecimal newOutstanding = invoice.getTotalAmount().subtract(newPaid).setScale(2, RoundingMode.HALF_UP);
        if (newOutstanding.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalStateException("Payment would overpay invoice " + invoice.getInvoiceNumber());
        }

        invoice.setPaidAmount(newPaid);
        invoice.setOutstandingAmount(newOutstanding);
        purchaseInvoiceRepository.save(invoice);

        payment.setStatus(SupplierPaymentStatus.POSTED);
        SupplierPayment saved = supplierPaymentRepository.save(payment);

        log.info("Posted supplier payment {} of {} against invoice {}; outstanding now {}",
                saved.getPaymentNumber(), saved.getAmount(), invoice.getInvoiceNumber(), newOutstanding);

        return mapToResponse(saved);
    }

    private void validateEligibleInvoice(PurchaseInvoice invoice) {
        if (invoice.getStatus() != PurchaseInvoiceStatus.POSTED) {
            throw new IllegalArgumentException(
                    "Only posted purchase invoices can be paid. Invoice status is " + invoice.getStatus());
        }
        if (invoice.getOutstandingAmount() == null
                || invoice.getOutstandingAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalStateException(
                    "Purchase invoice " + invoice.getInvoiceNumber() + " has no outstanding balance");
        }
    }

    private void validateAmount(BigDecimal amount, BigDecimal outstanding) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Payment amount must be greater than zero");
        }
        if (amount.compareTo(outstanding) > 0) {
            throw new IllegalArgumentException(
                    "Payment amount cannot exceed outstanding balance of ₹" + outstanding.toPlainString());
        }
    }

    private EligiblePurchaseInvoiceResponse mapToEligibleInvoice(PurchaseInvoice invoice) {
        return new EligiblePurchaseInvoiceResponse(
                invoice.getId(),
                invoice.getInvoiceNumber(),
                invoice.getInvoiceDate(),
                invoice.getSupplier().getId(),
                invoice.getSupplier().getSupplierCode(),
                invoice.getSupplier().getName(),
                invoice.getTotalAmount(),
                invoice.getPaidAmount(),
                invoice.getOutstandingAmount()
        );
    }

    private SupplierPaymentResponse mapToResponse(SupplierPayment payment) {
        PurchaseInvoice invoice = payment.getPurchaseInvoice();
        return new SupplierPaymentResponse(
                payment.getId(),
                payment.getPaymentNumber(),
                payment.getPaymentDate(),
                invoice.getId(),
                invoice.getInvoiceNumber(),
                payment.getSupplier().getId(),
                payment.getSupplier().getSupplierCode(),
                payment.getSupplier().getName(),
                invoice.getTotalAmount(),
                invoice.getPaidAmount(),
                invoice.getOutstandingAmount(),
                payment.getAmount(),
                payment.getPaymentMethod(),
                payment.getPaymentReference(),
                payment.getNotes(),
                payment.getStatus(),
                payment.getCreatedAt(),
                payment.getUpdatedAt()
        );
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void requireOrg(Long orgId) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
    }
}
