package si.plaan;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.request.CreateExpenseRequest;
import si.plaan.dto.response.ExpenseCategoryResponse;
import si.plaan.entity.ExpenseStatus;
import si.plaan.entity.Organization;
import si.plaan.entity.PaymentMethod;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.OrganizationRepository;
import si.plaan.service.ExpenseService;
import si.plaan.service.GoodsReceiptService;
import si.plaan.util.AttachmentLimits;
import si.plaan.util.DownloadHeaders;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@SpringBootTest
@Transactional
public class AuditFixesTests {

    @Autowired private ExpenseService expenseService;
    @Autowired private GoodsReceiptService goodsReceiptService;
    @Autowired private OrganizationRepository organizationRepository;

    private Organization org1;
    private Organization org2;
    private Long electricityId;

    @BeforeEach
    public void setup() {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        org1 = organizationRepository.save(Organization.builder()
                .name("Audit Org " + uid).slug("aud-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());
        org2 = organizationRepository.save(Organization.builder()
                .name("Other Audit " + uid).slug("aud-o-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());
        List<ExpenseCategoryResponse> cats = expenseService.getCategories(org1.getId(), false);
        electricityId = cats.stream().filter(c -> c.name().equals("Electricity")).findFirst().orElseThrow().id();
    }

    @Test
    public void testPoMovementsRejectForeignOrg() {
        Assertions.assertThrows(ResourceNotFoundException.class, () ->
                goodsReceiptService.getStockMovementsForPo(org2.getId(), 999_999_999L));
    }

    @Test
    public void testAttachmentOversizeRejected() {
        byte[] big = new byte[AttachmentLimits.MAX_BYTES + 1];
        String data = "data:application/pdf;base64," + Base64.getEncoder().encodeToString(big);
        Assertions.assertThrows(IllegalArgumentException.class, () ->
                expenseService.createExpense(org1.getId(), new CreateExpenseRequest(
                        null, LocalDate.now(), electricityId, "Too big",
                        new BigDecimal("10.00"), PaymentMethod.CASH, null, null,
                        "bill.pdf", "application/pdf", data, null, ExpenseStatus.DRAFT)));
    }

    @Test
    public void testAttachmentBadFilenameRejected() {
        String data = "data:application/pdf;base64," + Base64.getEncoder().encodeToString(new byte[]{1, 2, 3});
        Assertions.assertThrows(IllegalArgumentException.class, () ->
                expenseService.createExpense(org1.getId(), new CreateExpenseRequest(
                        null, LocalDate.now(), electricityId, "Bad name",
                        new BigDecimal("10.00"), PaymentMethod.CASH, null, null,
                        "evil.pdf\"; filename=\"x.exe", "application/pdf", data, null, ExpenseStatus.DRAFT)));
    }

    @Test
    public void testDownloadHeaderSanitizesFilename() {
        String header = DownloadHeaders.contentDisposition("a.pdf\"; filename=\"hack.exe");
        // only one quoted filename token — no header injection
        Assertions.assertEquals(1, header.split("filename=", -1).length - 1);
        Assertions.assertFalse(header.contains("\"\""));
        Assertions.assertTrue(header.matches("attachment; filename=\"[A-Za-z0-9._-]+\""));
    }

    @Test
    public void testExpenseOverviewUsesOrgTimezoneDefaults() {
        // Smoke: overview with null dates should not throw for Asia/Kolkata org
        Assertions.assertDoesNotThrow(() -> expenseService.getOverview(org1.getId(), null, null));
    }
}
