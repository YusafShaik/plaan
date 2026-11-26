package si.plaan;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.request.*;
import si.plaan.dto.response.*;
import si.plaan.entity.ExpenseStatus;
import si.plaan.entity.Organization;
import si.plaan.entity.PaymentMethod;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.OrganizationRepository;
import si.plaan.service.ExpenseService;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@SpringBootTest
@Transactional
public class ExpenseTests {

    @Autowired private ExpenseService expenseService;
    @Autowired private OrganizationRepository organizationRepository;

    private Organization org1;
    private Organization org2;
    private Long electricityId;

    @BeforeEach
    public void setup() {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        org1 = organizationRepository.save(Organization.builder()
                .name("Exp Org " + uid).slug("exp-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());
        org2 = organizationRepository.save(Organization.builder()
                .name("Other Exp " + uid).slug("exp-o-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());

        List<ExpenseCategoryResponse> cats = expenseService.getCategories(org1.getId(), false);
        Assertions.assertTrue(cats.size() >= 8);
        electricityId = cats.stream().filter(c -> c.name().equals("Electricity")).findFirst().orElseThrow().id();
    }

    @Test
    public void testCreatePostAndOverview() {
        ExpenseResponse draft = expenseService.createExpense(org1.getId(), new CreateExpenseRequest(
                null, LocalDate.now(), electricityId, "Factory electricity bill",
                new BigDecimal("15000.00"), PaymentMethod.BANK_TRANSFER, "Electric Co", null,
                null, null, null, null, ExpenseStatus.DRAFT));
        Assertions.assertTrue(draft.expenseNumber().startsWith("EXP-"));
        Assertions.assertEquals(ExpenseStatus.DRAFT, draft.status());

        ExpenseOverviewResponse before = expenseService.getOverview(org1.getId(), null, null);
        Assertions.assertEquals(0, before.totalPostedThisMonth().compareTo(BigDecimal.ZERO));

        expenseService.postExpense(org1.getId(), draft.id());

        ExpenseOverviewResponse after = expenseService.getOverview(org1.getId(), null, null);
        Assertions.assertEquals(new BigDecimal("15000.00"), after.totalPostedThisMonth());
        Assertions.assertFalse(after.byCategory().isEmpty());
        Assertions.assertEquals("Electricity", after.byCategory().get(0).categoryName());
    }

    @Test
    public void testPostedImmutableAndDraftDelete() {
        ExpenseResponse posted = expenseService.createExpense(org1.getId(), new CreateExpenseRequest(
                null, LocalDate.now(), electricityId, "Rent",
                new BigDecimal("25000.00"), PaymentMethod.UPI, null, null,
                null, null, null, null, ExpenseStatus.POSTED));
        Assertions.assertThrows(IllegalStateException.class, () ->
                expenseService.deleteExpense(org1.getId(), posted.id()));
        Assertions.assertThrows(IllegalStateException.class, () ->
                expenseService.postExpense(org1.getId(), posted.id()));

        ExpenseResponse draft = expenseService.createExpense(org1.getId(), new CreateExpenseRequest(
                null, LocalDate.now(), electricityId, "Temp",
                new BigDecimal("100.00"), PaymentMethod.CASH, null, null,
                null, null, null, null, ExpenseStatus.DRAFT));
        expenseService.deleteExpense(org1.getId(), draft.id());
        Assertions.assertThrows(ResourceNotFoundException.class, () ->
                expenseService.getExpenseById(org1.getId(), draft.id()));
    }

    @Test
    public void testManageCategoriesAndTenantIsolation() {
        ExpenseCategoryResponse custom = expenseService.createCategory(org1.getId(),
                new CreateExpenseCategoryRequest("Machinery Lease"));
        Assertions.assertEquals("Machinery Lease", custom.name());

        ExpenseResponse expense = expenseService.createExpense(org1.getId(), new CreateExpenseRequest(
                null, LocalDate.now(), custom.id(), "Lease payment",
                new BigDecimal("5000.00"), PaymentMethod.CHEQUE, null, null,
                null, null, null, null, ExpenseStatus.POSTED));

        Assertions.assertThrows(ResourceNotFoundException.class, () ->
                expenseService.getExpenseById(org2.getId(), expense.id()));

        PageResponse<ExpenseResponse> org2List = expenseService.getExpenses(
                org2.getId(), null, null, null, null, null, null, PageRequest.of(0, 10));
        Assertions.assertEquals(0, org2List.totalElements());
    }
}
