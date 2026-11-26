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
import si.plaan.dto.request.CreateCustomerReceiptRequest;
import si.plaan.dto.request.UpdateCustomerReceiptRequest;
import si.plaan.dto.response.*;
import si.plaan.entity.*;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.CustomerReceiptRepository;
import si.plaan.repository.OrganizationRepository;
import si.plaan.repository.SalesInvoiceRepository;
import si.plaan.service.CustomerReceiptService;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomerReceiptServiceImpl implements CustomerReceiptService {

    private final CustomerReceiptRepository customerReceiptRepository;
    private final SalesInvoiceRepository salesInvoiceRepository;
    private final OrganizationRepository organizationRepository;

    private static final String REC_PREFIX = "REC-";

    @Override
    @Transactional(readOnly = true)
    public PageResponse<CustomerReceiptResponse> getReceipts(
            Long orgId, String search, CustomerReceiptStatus status, Pageable pageable) {
        requireOrg(orgId);

        Specification<CustomerReceipt> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("organization").get("id"), orgId));
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("receiptNumber")), pattern),
                        cb.like(cb.lower(root.get("salesInvoice").get("invoiceNumber")), pattern),
                        cb.like(cb.lower(root.get("customer").get("name")), pattern),
                        cb.like(cb.lower(root.get("paymentReference")), pattern)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<CustomerReceipt> page = customerReceiptRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(this::mapToResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public CustomerReceiptResponse getReceiptById(Long orgId, Long id) {
        requireOrg(orgId);
        return mapToResponse(customerReceiptRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer receipt not found with id: " + id)));
    }

    @Override
    @Transactional(readOnly = true)
    public String getNextReceiptNumber(Long orgId) {
        requireOrg(orgId);
        int maxNum = customerReceiptRepository.findMaxReceiptNumberByOrganizationId(orgId);
        return String.format("%s%03d", REC_PREFIX, maxNum + 1);
    }

    @Override
    @Transactional(readOnly = true)
    public List<EligibleSalesInvoiceResponse> getEligibleInvoices(Long orgId) {
        requireOrg(orgId);
        Specification<SalesInvoice> spec = (root, query, cb) -> cb.and(
                cb.equal(root.get("organization").get("id"), orgId),
                cb.equal(root.get("status"), SalesInvoiceStatus.POSTED),
                cb.greaterThan(root.get("outstandingAmount"), BigDecimal.ZERO)
        );
        return salesInvoiceRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream()
                .map(this::mapToEligibleInvoice)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public EligibleSalesInvoiceResponse getInvoiceDetailsForReceipt(Long orgId, Long invoiceId) {
        requireOrg(orgId);
        SalesInvoice invoice = salesInvoiceRepository.findByIdAndOrganizationId(invoiceId, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Sales invoice not found with id: " + invoiceId));
        validateEligibleInvoice(invoice);
        return mapToEligibleInvoice(invoice);
    }

    @Override
    @Transactional
    public CustomerReceiptResponse createReceipt(Long orgId, CreateCustomerReceiptRequest request) {
        requireOrg(orgId);
        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with id: " + orgId));

        SalesInvoice invoice = salesInvoiceRepository.findByIdAndOrganizationId(request.salesInvoiceId(), orgId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Sales invoice not found with id: " + request.salesInvoiceId()));
        validateEligibleInvoice(invoice);

        BigDecimal amount = request.amount().setScale(2, RoundingMode.HALF_UP);
        validateAmount(amount, invoice.getOutstandingAmount());

        String receiptNumber = request.receiptNumber() != null && !request.receiptNumber().isBlank()
                ? request.receiptNumber().trim().toUpperCase()
                : getNextReceiptNumber(orgId);
        if (customerReceiptRepository.existsByOrganizationIdAndReceiptNumberIgnoreCase(orgId, receiptNumber)) {
            throw new IllegalArgumentException(
                    "Receipt number '" + receiptNumber + "' already exists in this organization");
        }

        CustomerReceiptStatus targetStatus =
                request.status() != null ? request.status() : CustomerReceiptStatus.DRAFT;

        CustomerReceipt receipt = CustomerReceipt.builder()
                .organization(org)
                .receiptNumber(receiptNumber)
                .receiptDate(request.receiptDate())
                .salesInvoice(invoice)
                .customer(invoice.getCustomer())
                .amount(amount)
                .paymentMethod(request.paymentMethod())
                .paymentReference(trimToNull(request.paymentReference()))
                .notes(trimToNull(request.notes()))
                .status(CustomerReceiptStatus.DRAFT)
                .build();

        CustomerReceipt saved = customerReceiptRepository.save(receipt);
        if (targetStatus == CustomerReceiptStatus.POSTED) {
            return applyPost(orgId, saved);
        }
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public CustomerReceiptResponse updateReceipt(Long orgId, Long id, UpdateCustomerReceiptRequest request) {
        requireOrg(orgId);
        CustomerReceipt receipt = customerReceiptRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer receipt not found with id: " + id));
        if (receipt.getStatus() == CustomerReceiptStatus.POSTED) {
            throw new IllegalStateException("Cannot edit a posted customer receipt");
        }

        SalesInvoice invoice = salesInvoiceRepository.findByIdAndOrganizationId(
                        receipt.getSalesInvoice().getId(), orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Sales invoice not found"));
        validateEligibleInvoice(invoice);

        BigDecimal amount = request.amount().setScale(2, RoundingMode.HALF_UP);
        validateAmount(amount, invoice.getOutstandingAmount());

        receipt.setReceiptDate(request.receiptDate());
        receipt.setAmount(amount);
        receipt.setPaymentMethod(request.paymentMethod());
        receipt.setPaymentReference(trimToNull(request.paymentReference()));
        receipt.setNotes(trimToNull(request.notes()));

        CustomerReceiptStatus targetStatus =
                request.status() != null ? request.status() : receipt.getStatus();
        CustomerReceipt saved = customerReceiptRepository.save(receipt);
        if (targetStatus == CustomerReceiptStatus.POSTED) {
            return applyPost(orgId, saved);
        }
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public CustomerReceiptResponse postReceipt(Long orgId, Long id) {
        requireOrg(orgId);
        CustomerReceipt receipt = customerReceiptRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer receipt not found with id: " + id));
        return applyPost(orgId, receipt);
    }

    @Override
    @Transactional
    public void deleteReceipt(Long orgId, Long id) {
        requireOrg(orgId);
        CustomerReceipt receipt = customerReceiptRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer receipt not found with id: " + id));
        if (receipt.getStatus() == CustomerReceiptStatus.POSTED) {
            throw new IllegalStateException("Cannot delete a posted customer receipt");
        }
        customerReceiptRepository.delete(receipt);
    }

    private CustomerReceiptResponse applyPost(Long orgId, CustomerReceipt receipt) {
        if (receipt.getStatus() == CustomerReceiptStatus.POSTED) {
            throw new IllegalStateException("Receipt " + receipt.getReceiptNumber() + " is already posted");
        }

        SalesInvoice invoice = salesInvoiceRepository.findByIdAndOrganizationId(
                        receipt.getSalesInvoice().getId(), orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Sales invoice not found"));
        validateEligibleInvoice(invoice);
        validateAmount(receipt.getAmount(), invoice.getOutstandingAmount());

        BigDecimal newReceived = invoice.getReceivedAmount().add(receipt.getAmount()).setScale(2, RoundingMode.HALF_UP);
        BigDecimal newOutstanding = invoice.getTotalAmount().subtract(newReceived).setScale(2, RoundingMode.HALF_UP);
        if (newOutstanding.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalStateException("Receipt would over-settle invoice " + invoice.getInvoiceNumber());
        }

        invoice.setReceivedAmount(newReceived);
        invoice.setOutstandingAmount(newOutstanding);
        salesInvoiceRepository.save(invoice);

        receipt.setStatus(CustomerReceiptStatus.POSTED);
        CustomerReceipt saved = customerReceiptRepository.save(receipt);
        log.info("Posted customer receipt {} of {} against {}; outstanding {}",
                saved.getReceiptNumber(), saved.getAmount(), invoice.getInvoiceNumber(), newOutstanding);
        return mapToResponse(saved);
    }

    private void validateEligibleInvoice(SalesInvoice invoice) {
        if (invoice.getStatus() != SalesInvoiceStatus.POSTED) {
            throw new IllegalArgumentException(
                    "Only posted sales invoices can receive receipts. Status is " + invoice.getStatus());
        }
        if (invoice.getOutstandingAmount() == null
                || invoice.getOutstandingAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalStateException(
                    "Sales invoice " + invoice.getInvoiceNumber() + " has no outstanding receivable");
        }
    }

    private void validateAmount(BigDecimal amount, BigDecimal outstanding) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Receipt amount must be greater than zero");
        }
        if (amount.compareTo(outstanding) > 0) {
            throw new IllegalArgumentException(
                    "Receipt amount cannot exceed outstanding receivable of ₹" + outstanding.toPlainString());
        }
    }

    private EligibleSalesInvoiceResponse mapToEligibleInvoice(SalesInvoice invoice) {
        return new EligibleSalesInvoiceResponse(
                invoice.getId(),
                invoice.getInvoiceNumber(),
                invoice.getInvoiceDate(),
                invoice.getCustomer().getId(),
                invoice.getCustomer().getCustomerCode(),
                invoice.getCustomer().getName(),
                invoice.getTotalAmount(),
                invoice.getReceivedAmount(),
                invoice.getOutstandingAmount()
        );
    }

    private CustomerReceiptResponse mapToResponse(CustomerReceipt receipt) {
        SalesInvoice invoice = receipt.getSalesInvoice();
        return new CustomerReceiptResponse(
                receipt.getId(),
                receipt.getReceiptNumber(),
                receipt.getReceiptDate(),
                invoice.getId(),
                invoice.getInvoiceNumber(),
                receipt.getCustomer().getId(),
                receipt.getCustomer().getCustomerCode(),
                receipt.getCustomer().getName(),
                invoice.getTotalAmount(),
                invoice.getReceivedAmount(),
                invoice.getOutstandingAmount(),
                receipt.getAmount(),
                receipt.getPaymentMethod(),
                receipt.getPaymentReference(),
                receipt.getNotes(),
                receipt.getStatus(),
                receipt.getCreatedAt(),
                receipt.getUpdatedAt()
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
