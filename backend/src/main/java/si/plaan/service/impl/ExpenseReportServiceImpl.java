package si.plaan.service.impl;

import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.response.ExpenseReportCategoryBreakdownResponse;
import si.plaan.dto.response.ExpenseReportPaymentBreakdownResponse;
import si.plaan.dto.response.ExpenseReportResponse;
import si.plaan.dto.response.ExpenseReportRowResponse;
import si.plaan.dto.response.ExpenseReportTotalsResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.entity.Expense;
import si.plaan.entity.ExpenseStatus;
import si.plaan.entity.Organization;
import si.plaan.entity.PaymentMethod;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.ExpenseRepository;
import si.plaan.repository.OrganizationRepository;
import si.plaan.service.ExpenseReportService;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ExpenseReportServiceImpl implements ExpenseReportService {

    private final ExpenseRepository expenseRepository;
    private final OrganizationRepository organizationRepository;

    @Override
    @Transactional(readOnly = true)
    public ExpenseReportResponse getReport(
            Long orgId,
            LocalDate fromDate,
            LocalDate toDate,
            Long categoryId,
            PaymentMethod paymentMethod,
            String search,
            Pageable pageable) {
        Organization org = requireOrg(orgId);
        DateRange range = normalizeRange(org, fromDate, toDate);

        List<Expense> all = expenseRepository.findAll(
                buildSpec(orgId, range.from(), range.to(), categoryId, paymentMethod, search),
                Sort.by(Sort.Direction.DESC, "expenseDate", "id"));

        ExpenseReportTotalsResponse summary = computeSummary(all);
        List<ExpenseReportCategoryBreakdownResponse> byCategory =
                computeCategoryBreakdown(all, summary.totalExpenses());
        List<ExpenseReportPaymentBreakdownResponse> byPaymentMethod =
                computePaymentBreakdown(all, summary.totalExpenses());

        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), all.size());
        List<ExpenseReportRowResponse> pageContent = start >= all.size()
                ? List.of()
                : all.subList(start, end).stream().map(this::mapRow).toList();

        return new ExpenseReportResponse(
                org.getBaseCurrency() != null ? org.getBaseCurrency() : "INR",
                range.from(),
                range.to(),
                summary,
                byCategory,
                byPaymentMethod,
                PageResponse.from(new PageImpl<>(pageContent, pageable, all.size()))
        );
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportCsv(
            Long orgId,
            LocalDate fromDate,
            LocalDate toDate,
            Long categoryId,
            PaymentMethod paymentMethod,
            String search) {
        Organization org = requireOrg(orgId);
        DateRange range = normalizeRange(org, fromDate, toDate);
        List<Expense> rows = expenseRepository.findAll(
                buildSpec(orgId, range.from(), range.to(), categoryId, paymentMethod, search),
                Sort.by(Sort.Direction.DESC, "expenseDate", "id"));

        StringBuilder csv = new StringBuilder();
        csv.append("Expense Number,Expense Date,Category,Description,Payee,Payment Method,")
                .append("Payment Reference,Amount\n");
        for (Expense expense : rows) {
            csv.append(csvCell(expense.getExpenseNumber())).append(',')
                    .append(expense.getExpenseDate()).append(',')
                    .append(csvCell(expense.getCategory().getName())).append(',')
                    .append(csvCell(expense.getDescription())).append(',')
                    .append(csvCell(expense.getPaidTo())).append(',')
                    .append(expense.getPaymentMethod().name()).append(',')
                    .append(csvCell(expense.getPaymentReference())).append(',')
                    .append(money(expense.getAmount()))
                    .append('\n');
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private Specification<Expense> buildSpec(
            Long orgId,
            LocalDate from,
            LocalDate to,
            Long categoryId,
            PaymentMethod paymentMethod,
            String search) {
        return (root, query, cb) -> {
            if (Expense.class.equals(query.getResultType())) {
                root.fetch("category");
            }
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("organization").get("id"), orgId));
            predicates.add(cb.equal(root.get("status"), ExpenseStatus.POSTED));
            predicates.add(cb.greaterThanOrEqualTo(root.get("expenseDate"), from));
            predicates.add(cb.lessThanOrEqualTo(root.get("expenseDate"), to));

            if (categoryId != null) {
                predicates.add(cb.equal(root.get("category").get("id"), categoryId));
            }
            if (paymentMethod != null) {
                predicates.add(cb.equal(root.get("paymentMethod"), paymentMethod));
            }
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("expenseNumber")), pattern),
                        cb.like(cb.lower(root.get("description")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("paidTo"), "")), pattern)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private ExpenseReportTotalsResponse computeSummary(List<Expense> expenses) {
        BigDecimal total = BigDecimal.ZERO;
        for (Expense expense : expenses) {
            total = total.add(nz(expense.getAmount()));
        }
        return new ExpenseReportTotalsResponse(total, expenses.size());
    }

    private List<ExpenseReportCategoryBreakdownResponse> computeCategoryBreakdown(
            List<Expense> expenses, BigDecimal total) {
        Map<Long, ExpenseReportCategoryBreakdownResponse> map = new LinkedHashMap<>();
        for (Expense expense : expenses) {
            Long id = expense.getCategory().getId();
            BigDecimal amount = nz(expense.getAmount());
            map.merge(
                    id,
                    new ExpenseReportCategoryBreakdownResponse(
                            id, expense.getCategory().getName(), amount, BigDecimal.ZERO),
                    (existing, incoming) -> new ExpenseReportCategoryBreakdownResponse(
                            existing.categoryId(),
                            existing.categoryName(),
                            existing.amount().add(incoming.amount()),
                            BigDecimal.ZERO)
            );
        }
        return map.values().stream()
                .sorted(Comparator.comparing(ExpenseReportCategoryBreakdownResponse::amount).reversed())
                .map(row -> new ExpenseReportCategoryBreakdownResponse(
                        row.categoryId(),
                        row.categoryName(),
                        row.amount(),
                        percent(row.amount(), total)))
                .toList();
    }

    private List<ExpenseReportPaymentBreakdownResponse> computePaymentBreakdown(
            List<Expense> expenses, BigDecimal total) {
        Map<PaymentMethod, BigDecimal> map = new LinkedHashMap<>();
        for (Expense expense : expenses) {
            map.merge(expense.getPaymentMethod(), nz(expense.getAmount()), BigDecimal::add);
        }
        return map.entrySet().stream()
                .sorted(Map.Entry.<PaymentMethod, BigDecimal>comparingByValue().reversed())
                .map(entry -> new ExpenseReportPaymentBreakdownResponse(
                        entry.getKey(),
                        entry.getValue(),
                        percent(entry.getValue(), total)))
                .toList();
    }

    private ExpenseReportRowResponse mapRow(Expense expense) {
        return new ExpenseReportRowResponse(
                expense.getId(),
                expense.getExpenseNumber(),
                expense.getExpenseDate(),
                expense.getCategory().getId(),
                expense.getCategory().getName(),
                expense.getDescription(),
                expense.getPaidTo(),
                expense.getPaymentMethod(),
                expense.getPaymentReference(),
                nz(expense.getAmount())
        );
    }

    private DateRange normalizeRange(Organization org, LocalDate fromDate, LocalDate toDate) {
        LocalDate today = LocalDate.now(resolveOrgZone(org));
        LocalDate from = fromDate != null ? fromDate : today.withDayOfMonth(1);
        LocalDate to = toDate != null ? toDate : today;
        if (to.isBefore(from)) {
            throw new IllegalArgumentException("To Date cannot be before From Date");
        }
        return new DateRange(from, to);
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

    private Organization requireOrg(Long orgId) {
        if (orgId == null) throw new AccessDeniedException("Organization context required");
        return organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with id: " + orgId));
    }

    private static BigDecimal percent(BigDecimal part, BigDecimal total) {
        if (total == null || total.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO.setScale(1, RoundingMode.HALF_UP);
        }
        return part.multiply(new BigDecimal("100"))
                .divide(total, 1, RoundingMode.HALF_UP);
    }

    private static BigDecimal nz(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private static String money(BigDecimal value) {
        return value != null ? value.stripTrailingZeros().toPlainString() : "0";
    }

    private static String csvCell(String value) {
        if (value == null) return "";
        String escaped = value.replace("\"", "\"\"");
        if (escaped.contains(",") || escaped.contains("\"") || escaped.contains("\n")) {
            return "\"" + escaped + "\"";
        }
        return escaped;
    }

    private record DateRange(LocalDate from, LocalDate to) {}
}
