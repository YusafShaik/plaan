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
import si.plaan.dto.request.*;
import si.plaan.dto.response.*;
import si.plaan.entity.*;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.ExpenseCategoryRepository;
import si.plaan.repository.ExpenseRepository;
import si.plaan.repository.OrganizationRepository;
import si.plaan.service.ExpenseService;
import si.plaan.util.AttachmentLimits;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExpenseServiceImpl implements ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final ExpenseCategoryRepository expenseCategoryRepository;
    private final OrganizationRepository organizationRepository;

    private static final String EXP_PREFIX = "EXP-";
    private static final List<String> DEFAULT_CATEGORIES = List.of(
            "Electricity",
            "Rent",
            "Transportation",
            "Salaries & Wages",
            "Repairs & Maintenance",
            "Office Supplies",
            "Internet & Telephone",
            "Other"
    );

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ExpenseResponse> getExpenses(
            Long orgId,
            String search,
            ExpenseStatus status,
            Long categoryId,
            PaymentMethod paymentMethod,
            LocalDate fromDate,
            LocalDate toDate,
            Pageable pageable) {
        requireOrg(orgId);

        Specification<Expense> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("organization").get("id"), orgId));
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (categoryId != null) {
                predicates.add(cb.equal(root.get("category").get("id"), categoryId));
            }
            if (paymentMethod != null) {
                predicates.add(cb.equal(root.get("paymentMethod"), paymentMethod));
            }
            if (fromDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("expenseDate"), fromDate));
            }
            if (toDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("expenseDate"), toDate));
            }
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("expenseNumber")), pattern),
                        cb.like(cb.lower(root.get("description")), pattern),
                        cb.like(cb.lower(root.get("paidTo")), pattern),
                        cb.like(cb.lower(root.get("category").get("name")), pattern)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Expense> page = expenseRepository.findAll(spec, pageable);
        return PageResponse.from(page.map(this::mapToResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public ExpenseResponse getExpenseById(Long orgId, Long id) {
        requireOrg(orgId);
        return mapToResponse(expenseRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found with id: " + id)));
    }

    @Override
    @Transactional(readOnly = true)
    public String getNextExpenseNumber(Long orgId) {
        requireOrg(orgId);
        int max = expenseRepository.findMaxExpenseNumberByOrganizationId(orgId);
        return String.format("%s%03d", EXP_PREFIX, max + 1);
    }

    @Override
    @Transactional(readOnly = true)
    public ExpenseOverviewResponse getOverview(Long orgId, LocalDate fromDate, LocalDate toDate) {
        requireOrg(orgId);
        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with id: " + orgId));
        ZoneId zone = resolveOrgZone(org);
        LocalDate from = fromDate != null ? fromDate : LocalDate.now(zone).withDayOfMonth(1);
        LocalDate to = toDate != null ? toDate : LocalDate.now(zone);

        BigDecimal total = expenseRepository.sumPostedAmountBetween(orgId, from, to);
        List<ExpenseCategoryTotalResponse> byCategory = expenseRepository
                .sumPostedByCategoryBetween(orgId, from, to)
                .stream()
                .map(row -> new ExpenseCategoryTotalResponse((String) row[0], (BigDecimal) row[1]))
                .toList();

        return new ExpenseOverviewResponse(total, byCategory);
    }

    @Override
    @Transactional
    public ExpenseResponse createExpense(Long orgId, CreateExpenseRequest request) {
        requireOrg(orgId);
        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with id: " + orgId));

        ExpenseCategory category = expenseCategoryRepository.findByIdAndOrganizationId(request.categoryId(), orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense category not found with id: " + request.categoryId()));
        if (!category.isActive()) {
            throw new IllegalArgumentException("Expense category '" + category.getName() + "' is inactive");
        }

        BigDecimal amount = request.amount().setScale(2, RoundingMode.HALF_UP);
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be greater than zero");
        }

        String number = request.expenseNumber() != null && !request.expenseNumber().isBlank()
                ? request.expenseNumber().trim().toUpperCase()
                : getNextExpenseNumber(orgId);
        if (expenseRepository.existsByOrganizationIdAndExpenseNumberIgnoreCase(orgId, number)) {
            throw new IllegalArgumentException("Expense number '" + number + "' already exists in this organization");
        }

        ExpenseStatus target = request.status() != null ? request.status() : ExpenseStatus.DRAFT;

        AttachmentLimits.validate(
                request.attachmentFileName(), request.attachmentContentType(), request.attachmentData());

        Expense expense = Expense.builder()
                .organization(org)
                .expenseNumber(number)
                .expenseDate(request.expenseDate())
                .category(category)
                .description(request.description().trim())
                .amount(amount)
                .paymentMethod(request.paymentMethod())
                .paidTo(trimToNull(request.paidTo()))
                .paymentReference(trimToNull(request.paymentReference()))
                .attachmentFileName(request.attachmentFileName())
                .attachmentContentType(request.attachmentContentType())
                .attachmentData(request.attachmentData())
                .notes(trimToNull(request.notes()))
                .status(target == ExpenseStatus.POSTED ? ExpenseStatus.POSTED : ExpenseStatus.DRAFT)
                .build();

        Expense saved = expenseRepository.save(expense);
        log.info("Created expense {} status {} for org {}", saved.getExpenseNumber(), saved.getStatus(), orgId);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public ExpenseResponse updateExpense(Long orgId, Long id, UpdateExpenseRequest request) {
        requireOrg(orgId);
        Expense expense = expenseRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found with id: " + id));
        if (expense.getStatus() == ExpenseStatus.POSTED) {
            throw new IllegalStateException("Cannot edit a posted expense");
        }

        ExpenseCategory category = expenseCategoryRepository.findByIdAndOrganizationId(request.categoryId(), orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense category not found with id: " + request.categoryId()));

        BigDecimal amount = request.amount().setScale(2, RoundingMode.HALF_UP);
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be greater than zero");
        }

        expense.setExpenseDate(request.expenseDate());
        expense.setCategory(category);
        expense.setDescription(request.description().trim());
        expense.setAmount(amount);
        expense.setPaymentMethod(request.paymentMethod());
        expense.setPaidTo(trimToNull(request.paidTo()));
        expense.setPaymentReference(trimToNull(request.paymentReference()));
        expense.setNotes(trimToNull(request.notes()));
        if (request.attachmentFileName() != null) {
            AttachmentLimits.validate(
                    request.attachmentFileName(), request.attachmentContentType(), request.attachmentData());
            expense.setAttachmentFileName(request.attachmentFileName());
            expense.setAttachmentContentType(request.attachmentContentType());
            expense.setAttachmentData(request.attachmentData());
        }

        ExpenseStatus target = request.status() != null ? request.status() : expense.getStatus();
        if (target == ExpenseStatus.POSTED) {
            expense.setStatus(ExpenseStatus.POSTED);
        }

        return mapToResponse(expenseRepository.save(expense));
    }

    @Override
    @Transactional
    public ExpenseResponse postExpense(Long orgId, Long id) {
        requireOrg(orgId);
        Expense expense = expenseRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found with id: " + id));
        if (expense.getStatus() == ExpenseStatus.POSTED) {
            throw new IllegalStateException("Expense " + expense.getExpenseNumber() + " is already posted");
        }
        expense.setStatus(ExpenseStatus.POSTED);
        Expense saved = expenseRepository.save(expense);
        log.info("Posted expense {} amount {} for org {}", saved.getExpenseNumber(), saved.getAmount(), orgId);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public void deleteExpense(Long orgId, Long id) {
        requireOrg(orgId);
        Expense expense = expenseRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found with id: " + id));
        if (expense.getStatus() == ExpenseStatus.POSTED) {
            throw new IllegalStateException("Cannot delete a posted expense");
        }
        expenseRepository.delete(expense);
    }

    @Override
    @Transactional
    public List<ExpenseCategoryResponse> getCategories(Long orgId, boolean includeInactive) {
        requireOrg(orgId);
        ensureDefaultCategories(orgId);
        List<ExpenseCategory> categories = includeInactive
                ? expenseCategoryRepository.findByOrganizationIdOrderBySortOrderAscNameAsc(orgId)
                : expenseCategoryRepository.findByOrganizationIdAndActiveTrueOrderBySortOrderAscNameAsc(orgId);
        return categories.stream().map(this::mapCategory).toList();
    }

    @Override
    @Transactional
    public ExpenseCategoryResponse createCategory(Long orgId, CreateExpenseCategoryRequest request) {
        requireOrg(orgId);
        ensureDefaultCategories(orgId);
        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with id: " + orgId));

        String name = request.name().trim();
        if (expenseCategoryRepository.existsByOrganizationIdAndNameIgnoreCase(orgId, name)) {
            throw new IllegalArgumentException("Category '" + name + "' already exists");
        }

        ExpenseCategory category = ExpenseCategory.builder()
                .organization(org)
                .name(name)
                .active(true)
                .sortOrder(100)
                .build();
        return mapCategory(expenseCategoryRepository.save(category));
    }

    @Override
    @Transactional
    public ExpenseCategoryResponse updateCategory(Long orgId, Long id, UpdateExpenseCategoryRequest request) {
        requireOrg(orgId);
        ExpenseCategory category = expenseCategoryRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense category not found with id: " + id));

        String name = request.name().trim();
        if (expenseCategoryRepository.existsByOrganizationIdAndNameIgnoreCaseAndIdNot(orgId, name, id)) {
            throw new IllegalArgumentException("Category '" + name + "' already exists");
        }
        category.setName(name);
        if (request.active() != null) {
            category.setActive(request.active());
        }
        return mapCategory(expenseCategoryRepository.save(category));
    }

    @Override
    @Transactional(readOnly = true)
    public AttachmentData getAttachment(Long orgId, Long id) {
        requireOrg(orgId);
        Expense expense = expenseRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found with id: " + id));
        if (expense.getAttachmentData() == null || expense.getAttachmentData().isBlank()) {
            throw new ResourceNotFoundException("No attachment found for expense " + expense.getExpenseNumber());
        }

        byte[] bytes;
        try {
            String data = expense.getAttachmentData();
            if (data.contains(",")) {
                data = data.substring(data.indexOf(",") + 1);
            }
            bytes = Base64.getDecoder().decode(data);
        } catch (Exception e) {
            bytes = expense.getAttachmentData().getBytes();
        }

        return new AttachmentData(
                expense.getAttachmentFileName() != null ? expense.getAttachmentFileName() : "expense-attachment",
                expense.getAttachmentContentType() != null ? expense.getAttachmentContentType() : "application/octet-stream",
                bytes
        );
    }

    private void ensureDefaultCategories(Long orgId) {
        if (expenseCategoryRepository.countByOrganizationId(orgId) > 0) {
            return;
        }
        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with id: " + orgId));
        int order = 1;
        for (String name : DEFAULT_CATEGORIES) {
            expenseCategoryRepository.save(ExpenseCategory.builder()
                    .organization(org)
                    .name(name)
                    .active(true)
                    .sortOrder(order++)
                    .build());
        }
    }

    private ExpenseResponse mapToResponse(Expense expense) {
        return new ExpenseResponse(
                expense.getId(),
                expense.getExpenseNumber(),
                expense.getExpenseDate(),
                expense.getCategory().getId(),
                expense.getCategory().getName(),
                expense.getDescription(),
                expense.getAmount(),
                expense.getPaymentMethod(),
                expense.getPaidTo(),
                expense.getPaymentReference(),
                expense.getAttachmentFileName(),
                expense.getAttachmentContentType(),
                expense.getAttachmentData() != null && !expense.getAttachmentData().isBlank(),
                expense.getNotes(),
                expense.getStatus(),
                expense.getCreatedAt(),
                expense.getUpdatedAt()
        );
    }

    private ExpenseCategoryResponse mapCategory(ExpenseCategory category) {
        return new ExpenseCategoryResponse(
                category.getId(),
                category.getName(),
                category.isActive(),
                category.getSortOrder()
        );
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private ZoneId resolveOrgZone(Organization org) {
        if (org.getTimeZone() == null || org.getTimeZone().isBlank()) {
            return ZoneId.systemDefault();
        }
        try {
            return ZoneId.of(org.getTimeZone());
        } catch (Exception ex) {
            return ZoneId.systemDefault();
        }
    }

    private void requireOrg(Long orgId) {
        if (orgId == null) throw new AccessDeniedException("Organization context required");
    }
}
