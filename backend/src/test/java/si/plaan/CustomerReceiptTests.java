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
public class CustomerReceiptTests {

    @Autowired private CustomerReceiptService customerReceiptService;
    @Autowired private SalesInvoiceService salesInvoiceService;
    @Autowired private DispatchOrderService dispatchOrderService;
    @Autowired private SalesOrderService salesOrderService;
    @Autowired private CustomerService customerService;
    @Autowired private WarehouseService warehouseService;
    @Autowired private ItemService itemService;
    @Autowired private SupplierService supplierService;
    @Autowired private PurchaseOrderService purchaseOrderService;
    @Autowired private GoodsReceiptService goodsReceiptService;
    @Autowired private OrganizationRepository organizationRepository;

    private Organization org1;
    private Organization org2;
    private SalesInvoiceResponse postedInvoice;

    @BeforeEach
    public void setup() {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        org1 = organizationRepository.save(Organization.builder()
                .name("Rec Org " + uid).slug("rec-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());
        org2 = organizationRepository.save(Organization.builder()
                .name("Other Rec " + uid).slug("rec-o-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());

        CustomerResponse customer = customerService.createCustomer(org1.getId(), new CreateCustomerRequest(
                "CUS-R", "ABC Furniture", null, null, null, "Bill Addr", "Ship Addr", null, true));
        WarehouseResponse wh = warehouseService.createWarehouse(org1.getId(), new CreateWarehouseRequest(
                "WH-R", "FG", "BLR", null, true));
        ItemResponse table = itemService.createItem(org1.getId(), new CreateItemRequest(
                "ITEM-R", "Wooden Table", null, "Finished Goods", null, null, "Nos", null, true));

        // stock then SO + dispatch + SI
        SupplierResponse supplier = supplierService.createSupplier(org1.getId(), new CreateSupplierRequest(
                null, "Sup " + uid, null, null, null, null, null, true));
        PurchaseOrderResponse po = purchaseOrderService.createPurchaseOrder(org1.getId(), new CreatePurchaseOrderRequest(
                null, supplier.id(), wh.id(), LocalDate.now(), null, null, PurchaseOrderStatus.ISSUED,
                List.of(new PurchaseOrderItemRequest(table.id(), new BigDecimal("8.000"), BigDecimal.TEN))));
        GoodsReceiptResponse gr = goodsReceiptService.createGoodsReceipt(org1.getId(), new CreateGoodsReceiptRequest(
                null, po.id(), LocalDate.now(), null, null, GoodsReceiptStatus.DRAFT,
                List.of(new GoodsReceiptItemRequest(po.items().get(0).id(), table.id(), new BigDecimal("8.000")))));
        goodsReceiptService.postGoodsReceipt(org1.getId(), gr.id());

        SalesOrderResponse so = salesOrderService.createSalesOrder(org1.getId(), new CreateSalesOrderRequest(
                null, customer.id(), wh.id(), LocalDate.now(), null, null, "Bill Addr", "Ship Addr", null,
                SalesOrderStatus.DRAFT,
                List.of(new SalesOrderItemRequest(null, table.id(), new BigDecimal("8.000"), new BigDecimal("2500.00")))));
        so = salesOrderService.confirmSalesOrder(org1.getId(), so.id());

        DispatchOrderResponse dispatch = dispatchOrderService.createDispatchOrder(org1.getId(), new CreateDispatchOrderRequest(
                null, so.id(), LocalDate.now(), "Ship Addr", null, null, null, null, DispatchOrderStatus.POSTED,
                List.of(new DispatchOrderItemRequest(so.items().get(0).id(), table.id(), new BigDecimal("8.000")))));

        postedInvoice = salesInvoiceService.createSalesInvoice(org1.getId(), new CreateSalesInvoiceRequest(
                null, LocalDate.now(), null, dispatch.id(), new BigDecimal("3600.00"), null, SalesInvoiceStatus.POSTED));
        // total 23600
    }

    @Test
    public void testPartialAndFullSettlement() {
        Assertions.assertEquals(InvoicePaymentStatus.UNPAID, postedInvoice.paymentStatus());

        customerReceiptService.createReceipt(org1.getId(), new CreateCustomerReceiptRequest(
                null, LocalDate.now(), postedInvoice.id(), new BigDecimal("15000.00"),
                PaymentMethod.BANK_TRANSFER, "TXN-1", null, CustomerReceiptStatus.POSTED));

        SalesInvoiceResponse after1 = salesInvoiceService.getSalesInvoiceById(org1.getId(), postedInvoice.id());
        Assertions.assertEquals(InvoicePaymentStatus.PARTIALLY_PAID, after1.paymentStatus());
        Assertions.assertEquals(new BigDecimal("8600.00"), after1.outstandingAmount());
        Assertions.assertEquals(1, after1.receiptHistory().size());

        customerReceiptService.createReceipt(org1.getId(), new CreateCustomerReceiptRequest(
                null, LocalDate.now(), postedInvoice.id(), new BigDecimal("8600.00"),
                PaymentMethod.UPI, null, null, CustomerReceiptStatus.POSTED));

        SalesInvoiceResponse after2 = salesInvoiceService.getSalesInvoiceById(org1.getId(), postedInvoice.id());
        Assertions.assertEquals(InvoicePaymentStatus.PAID, after2.paymentStatus());
        Assertions.assertEquals(0, after2.outstandingAmount().compareTo(BigDecimal.ZERO));
        Assertions.assertEquals(2, after2.receiptHistory().size());
    }

    @Test
    public void testPreventExcessAndDraftNoImpact() {
        Assertions.assertThrows(IllegalArgumentException.class, () ->
                customerReceiptService.createReceipt(org1.getId(), new CreateCustomerReceiptRequest(
                        null, LocalDate.now(), postedInvoice.id(), new BigDecimal("50000.00"),
                        PaymentMethod.CASH, null, null, CustomerReceiptStatus.DRAFT)));

        customerReceiptService.createReceipt(org1.getId(), new CreateCustomerReceiptRequest(
                null, LocalDate.now(), postedInvoice.id(), new BigDecimal("1000.00"),
                PaymentMethod.CASH, null, null, CustomerReceiptStatus.DRAFT));
        SalesInvoiceResponse inv = salesInvoiceService.getSalesInvoiceById(org1.getId(), postedInvoice.id());
        Assertions.assertEquals(0, inv.receivedAmount().compareTo(BigDecimal.ZERO));
    }

    @Test
    public void testPostedImmutableAndTenantIsolation() {
        CustomerReceiptResponse posted = customerReceiptService.createReceipt(org1.getId(), new CreateCustomerReceiptRequest(
                null, LocalDate.now(), postedInvoice.id(), new BigDecimal("1000.00"),
                PaymentMethod.OTHER, null, null, CustomerReceiptStatus.POSTED));
        Assertions.assertThrows(IllegalStateException.class, () ->
                customerReceiptService.deleteReceipt(org1.getId(), posted.id()));
        Assertions.assertThrows(ResourceNotFoundException.class, () ->
                customerReceiptService.getReceiptById(org2.getId(), posted.id()));
        Assertions.assertTrue(customerReceiptService.getEligibleInvoices(org2.getId()).isEmpty());
    }
}
