package si.plaan;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.request.CreateExpenseCategoryRequest;
import si.plaan.dto.request.CreateExpenseRequest;
import si.plaan.dto.request.UpdateExpenseCategoryRequest;
import si.plaan.dto.response.ExpenseCategoryResponse;
import si.plaan.dto.response.ExpenseReportResponse;
import si.plaan.dto.response.ExpenseResponse;
import si.plaan.entity.ExpenseStatus;
import si.plaan.entity.Organization;
import si.plaan.entity.PaymentMethod;
import si.plaan.repository.OrganizationRepository;
import si.plaan.service.ExpenseReportService;
import si.plaan.service.ExpenseService;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@SpringBootTest
@Transactional
public class ExpenseReportTests {

    @Autowired private ExpenseReportService reportService;
    @Autowired private ExpenseService expenseService;
    @Autowired private OrganizationRepository organizationRepository;

    private Organization org1;
    private Organization org2;
    private LocalDate today;
    private Map<String, Long> categoryIds;

    @BeforeEach
    void setup() {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        org1 = organizationRepository.save(Organization.builder()
                .name("ER Org " + uid).slug("er-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());
        org2 = organizationRepository.save(Organization.builder()
                .name("ER Other " + uid).slug("er-o-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());

        today = LocalDate.now(java.time.ZoneId.of("Asia/Kolkata"));
        List<ExpenseCategoryResponse> cats = expenseService.getCategories(org1.getId(), false);
        categoryIds = cats.stream().collect(Collectors.toMap(ExpenseCategoryResponse::name, ExpenseCategoryResponse::id));
    }

    private ExpenseResponse post(
            LocalDate date, String category, String description, BigDecimal amount,
            PaymentMethod method, String paidTo, String paymentRef) {
        return expenseService.createExpense(org1.getId(), new CreateExpenseRequest(
                null, date, categoryIds.get(category), description, amount, method, paidTo, paymentRef,
                null, null, null, null, ExpenseStatus.POSTED));
    }

    @Test
    public void testTotalsBreakdownsFiltersDraftExclusionAndIsolation() {
        LocalDate from = today.withDayOfMonth(1);

        post(from.plusDays(1), "Rent", "Factory rent", new BigDecimal("25000.00"),
                PaymentMethod.BANK_TRANSFER, "Landlord", "RENT-1");
        post(from.plusDays(4), "Electricity", "Factory electricity bill", new BigDecimal("15000.00"),
                PaymentMethod.UPI, "Electric Co", null);
        post(from.plusDays(9), "Salaries & Wages", "Worker wages", new BigDecimal("40000.00"),
                PaymentMethod.BANK_TRANSFER, "Payroll", "SAL-1");
        post(from.plusDays(14), "Transportation", "Material transport", new BigDecimal("8000.00"),
                PaymentMethod.CASH, "Driver", null);
        post(from.plusDays(19), "Repairs & Maintenance", "Machine servicing", new BigDecimal("12000.00"),
                PaymentMethod.UPI, "Service Co", "SVC-1");

        // Draft excluded
        expenseService.createExpense(org1.getId(), new CreateExpenseRequest(
                null, from.plusDays(2), categoryIds.get("Rent"), "Draft rent",
                new BigDecimal("9999.00"), PaymentMethod.CASH, null, null,
                null, null, null, null, ExpenseStatus.DRAFT));

        // Outside range excluded
        post(from.minusMonths(1), "Rent", "Old rent", new BigDecimal("25000.00"),
                PaymentMethod.BANK_TRANSFER, null, null);

        ExpenseReportResponse report = reportService.getReport(
                org1.getId(), from, today, null, null, null, PageRequest.of(0, 50));

        Assertions.assertEquals("INR", report.currency());
        Assertions.assertEquals(from, report.fromDate());
        Assertions.assertEquals(today, report.toDate());
        Assertions.assertEquals(5, report.summary().expenseTransactions());
        Assertions.assertEquals(0, new BigDecimal("100000.00").compareTo(report.summary().totalExpenses()));
        Assertions.assertEquals(5, report.expenses().totalElements());
        Assertions.assertEquals("Salaries & Wages", report.byCategory().get(0).categoryName());
        Assertions.assertEquals(0, new BigDecimal("40000.00").compareTo(report.byCategory().get(0).amount()));
        Assertions.assertEquals(0, new BigDecimal("40.0").compareTo(report.byCategory().get(0).percentage()));

        Assertions.assertEquals(PaymentMethod.BANK_TRANSFER, report.byPaymentMethod().get(0).paymentMethod());
        Assertions.assertEquals(0, new BigDecimal("65000.00").compareTo(report.byPaymentMethod().get(0).amount()));
        Assertions.assertEquals(0, new BigDecimal("65.0").compareTo(report.byPaymentMethod().get(0).percentage()));

        // Newest first
        Assertions.assertTrue(report.expenses().content().get(0).expenseDate()
                .compareTo(report.expenses().content().get(1).expenseDate()) >= 0);

        ExpenseReportResponse rentOnly = reportService.getReport(
                org1.getId(), from, today, categoryIds.get("Rent"), null, null, PageRequest.of(0, 20));
        Assertions.assertEquals(1, rentOnly.summary().expenseTransactions());
        Assertions.assertEquals(0, new BigDecimal("25000.00").compareTo(rentOnly.summary().totalExpenses()));
        Assertions.assertEquals(1, rentOnly.byCategory().size());

        ExpenseReportResponse upiOnly = reportService.getReport(
                org1.getId(), from, today, null, PaymentMethod.UPI, null, PageRequest.of(0, 20));
        Assertions.assertEquals(2, upiOnly.summary().expenseTransactions());
        Assertions.assertEquals(0, new BigDecimal("27000.00").compareTo(upiOnly.summary().totalExpenses()));

        ExpenseReportResponse search = reportService.getReport(
                org1.getId(), from, today, null, null, "electric", PageRequest.of(0, 20));
        Assertions.assertEquals(1, search.summary().expenseTransactions());
        Assertions.assertTrue(search.expenses().content().get(0).description().toLowerCase().contains("electric"));

        // Inactive category expenses still included
        ExpenseCategoryResponse custom = expenseService.createCategory(org1.getId(),
                new CreateExpenseCategoryRequest("Temp Tools"));
        expenseService.createExpense(org1.getId(), new CreateExpenseRequest(
                null, from.plusDays(3), custom.id(), "Tool hire",
                new BigDecimal("1000.00"), PaymentMethod.CASH, "Hire Co", null,
                null, null, null, null, ExpenseStatus.POSTED));
        expenseService.updateCategory(org1.getId(), custom.id(),
                new UpdateExpenseCategoryRequest("Temp Tools", false));

        ExpenseReportResponse withInactive = reportService.getReport(
                org1.getId(), from, today, null, null, "Tool hire", PageRequest.of(0, 20));
        Assertions.assertEquals(1, withInactive.summary().expenseTransactions());
        Assertions.assertEquals("Temp Tools", withInactive.expenses().content().get(0).categoryName());

        byte[] csv = reportService.exportCsv(org1.getId(), from, today, null, null, null);
        String text = new String(csv, StandardCharsets.UTF_8);
        Assertions.assertTrue(text.contains("Factory rent"));
        Assertions.assertTrue(text.contains("BANK_TRANSFER"));
        Assertions.assertTrue(text.contains("Salaries & Wages"));
        Assertions.assertFalse(text.contains("Draft rent"));

        // Defaults to current month when dates omitted
        ExpenseReportResponse defaults = reportService.getReport(
                org1.getId(), null, null, null, null, null, PageRequest.of(0, 50));
        Assertions.assertEquals(from, defaults.fromDate());
        Assertions.assertEquals(today, defaults.toDate());
        Assertions.assertTrue(defaults.summary().expenseTransactions() >= 5);

        ExpenseReportResponse other = reportService.getReport(
                org2.getId(), from, today, null, null, null, PageRequest.of(0, 10));
        Assertions.assertEquals(0, other.summary().expenseTransactions());
        Assertions.assertEquals(0, other.summary().totalExpenses().compareTo(BigDecimal.ZERO));
        Assertions.assertTrue(other.byCategory().isEmpty());
    }
}
