package si.plaan;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.request.*;
import si.plaan.dto.response.*;
import si.plaan.entity.*;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.OrganizationRepository;
import si.plaan.service.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@SpringBootTest
@Transactional
public class SupplierPaymentTests {

    @Autowired private SupplierPaymentService supplierPaymentService;
    @Autowired private PurchaseInvoiceService purchaseInvoiceService;
    @Autowired private PurchaseOrderService purchaseOrderService;
    @Autowired private GoodsReceiptService goodsReceiptService;
    @Autowired private ItemService itemService;
    @Autowired private SupplierService supplierService;
    @Autowired private WarehouseService warehouseService;
    @Autowired private OrganizationRepository organizationRepository;

    private Organization org1;
    private Organization org2;
    private PurchaseInvoiceResponse postedInvoice;

    @BeforeEach
    public void setup() {
        String uid = UUID.randomUUID().toString().substring(0, 8);

        org1 = organizationRepository.save(Organization.builder()
                .name("Pay Org " + uid).slug("pay-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());

        org2 = organizationRepository.save(Organization.builder()
                .name("Other Pay " + uid).slug("pay-o-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());

        SupplierResponse supplier = supplierService.createSupplier(org1.getId(), new CreateSupplierRequest(
                "SUP-P", "ABC Timber", null, null, null, null, null, true));
        WarehouseResponse warehouse = warehouseService.createWarehouse(org1.getId(), new CreateWarehouseRequest(
                "WH-P", "Store", "BLR", null, true));
        ItemResponse item = itemService.createItem(org1.getId(), new CreateItemRequest(
                "ITEM-P", "Board", null, "Raw Materials", null, null, "Nos", null, true));

        PurchaseOrderResponse po = purchaseOrderService.createPurchaseOrder(org1.getId(), new CreatePurchaseOrderRequest(
                null, supplier.id(), warehouse.id(), LocalDate.now(), null, null, PurchaseOrderStatus.ISSUED,
                List.of(new PurchaseOrderItemRequest(item.id(), new BigDecimal("20.000"), new BigDecimal("500.00")))
        ));

        GoodsReceiptResponse grn = goodsReceiptService.createGoodsReceipt(org1.getId(), new CreateGoodsReceiptRequest(
                null, po.id(), LocalDate.now(), null, null, GoodsReceiptStatus.DRAFT,
                List.of(new GoodsReceiptItemRequest(po.items().get(0).id(), item.id(), new BigDecimal("20.000")))
        ));
        grn = goodsReceiptService.postGoodsReceipt(org1.getId(), grn.id());

        EligibleGrnResponse details = purchaseInvoiceService.getGoodsReceiptDetailsForInvoice(org1.getId(), grn.id());
        postedInvoice = purchaseInvoiceService.createPurchaseInvoice(org1.getId(), new CreatePurchaseInvoiceRequest(
                null, "BILL-" + uid, LocalDate.now(), null, grn.id(), new BigDecimal("4500.00"),
                null, null, null, null, PurchaseInvoiceStatus.POSTED,
                List.of(new PurchaseInvoiceItemRequest(
                        details.items().get(0).goodsReceiptItemId(), item.id(), new BigDecimal("500.00")))
        ));
        // total = 20*500 + 4500 = 14500
    }

    @Test
    public void testPartialPaymentsAndInvoiceHistory() {
        Assertions.assertEquals(InvoicePaymentStatus.UNPAID, postedInvoice.paymentStatus());
        Assertions.assertEquals(new BigDecimal("14500.00"), postedInvoice.outstandingAmount());

        SupplierPaymentResponse p1 = supplierPaymentService.createPayment(org1.getId(), new CreateSupplierPaymentRequest(
                null, LocalDate.now(), postedInvoice.id(), new BigDecimal("10000.00"),
                PaymentMethod.BANK_TRANSFER, "TXN-1", null, SupplierPaymentStatus.POSTED
        ));
        Assertions.assertEquals(SupplierPaymentStatus.POSTED, p1.status());

        PurchaseInvoiceResponse after1 = purchaseInvoiceService.getPurchaseInvoiceById(org1.getId(), postedInvoice.id());
        Assertions.assertEquals(new BigDecimal("10000.00"), after1.paidAmount());
        Assertions.assertEquals(new BigDecimal("4500.00"), after1.outstandingAmount());
        Assertions.assertEquals(InvoicePaymentStatus.PARTIALLY_PAID, after1.paymentStatus());
        Assertions.assertEquals(1, after1.paymentHistory().size());

        supplierPaymentService.createPayment(org1.getId(), new CreateSupplierPaymentRequest(
                null, LocalDate.now(), postedInvoice.id(), new BigDecimal("4500.00"),
                PaymentMethod.UPI, null, null, SupplierPaymentStatus.POSTED
        ));

        PurchaseInvoiceResponse after2 = purchaseInvoiceService.getPurchaseInvoiceById(org1.getId(), postedInvoice.id());
        Assertions.assertEquals(InvoicePaymentStatus.PAID, after2.paymentStatus());
        Assertions.assertEquals(0, after2.outstandingAmount().compareTo(BigDecimal.ZERO));
        Assertions.assertEquals(2, after2.paymentHistory().size());
        Assertions.assertTrue(supplierPaymentService.getEligibleInvoices(org1.getId()).isEmpty());
    }

    @Test
    public void testPreventOverpayment() {
        Assertions.assertThrows(IllegalArgumentException.class, () ->
                supplierPaymentService.createPayment(org1.getId(), new CreateSupplierPaymentRequest(
                        null, LocalDate.now(), postedInvoice.id(), new BigDecimal("20000.00"),
                        PaymentMethod.CASH, null, null, SupplierPaymentStatus.DRAFT
                )));
    }

    @Test
    public void testDraftDoesNotAffectBalance() {
        supplierPaymentService.createPayment(org1.getId(), new CreateSupplierPaymentRequest(
                null, LocalDate.now(), postedInvoice.id(), new BigDecimal("1000.00"),
                PaymentMethod.CHEQUE, null, null, SupplierPaymentStatus.DRAFT
        ));
        PurchaseInvoiceResponse inv = purchaseInvoiceService.getPurchaseInvoiceById(org1.getId(), postedInvoice.id());
        Assertions.assertEquals(0, inv.paidAmount().compareTo(BigDecimal.ZERO));
        Assertions.assertEquals(InvoicePaymentStatus.UNPAID, inv.paymentStatus());
    }

    @Test
    public void testPostedCannotEditOrDelete() {
        SupplierPaymentResponse posted = supplierPaymentService.createPayment(org1.getId(), new CreateSupplierPaymentRequest(
                null, LocalDate.now(), postedInvoice.id(), new BigDecimal("1000.00"),
                PaymentMethod.CASH, null, null, SupplierPaymentStatus.POSTED
        ));
        Assertions.assertThrows(IllegalStateException.class, () ->
                supplierPaymentService.updatePayment(org1.getId(), posted.id(), new UpdateSupplierPaymentRequest(
                        LocalDate.now(), new BigDecimal("500.00"), PaymentMethod.CASH, null, null, SupplierPaymentStatus.POSTED
                )));
        Assertions.assertThrows(IllegalStateException.class, () ->
                supplierPaymentService.deletePayment(org1.getId(), posted.id()));
    }

    @Test
    public void testTenantIsolation() {
        SupplierPaymentResponse payment = supplierPaymentService.createPayment(org1.getId(), new CreateSupplierPaymentRequest(
                null, LocalDate.now(), postedInvoice.id(), new BigDecimal("500.00"),
                PaymentMethod.OTHER, null, null, SupplierPaymentStatus.DRAFT
        ));
        Assertions.assertThrows(ResourceNotFoundException.class, () ->
                supplierPaymentService.getPaymentById(org2.getId(), payment.id()));
        Assertions.assertTrue(supplierPaymentService.getEligibleInvoices(org2.getId()).isEmpty());
    }
}
