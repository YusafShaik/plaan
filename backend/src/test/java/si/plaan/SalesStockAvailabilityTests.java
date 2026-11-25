package si.plaan;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.request.CreateCustomerRequest;
import si.plaan.dto.request.CreateGoodsReceiptRequest;
import si.plaan.dto.request.CreateItemRequest;
import si.plaan.dto.request.CreatePurchaseOrderRequest;
import si.plaan.dto.request.CreateSalesOrderRequest;
import si.plaan.dto.request.CreateSupplierRequest;
import si.plaan.dto.request.CreateWarehouseRequest;
import si.plaan.dto.request.GoodsReceiptItemRequest;
import si.plaan.dto.request.PurchaseOrderItemRequest;
import si.plaan.dto.request.SalesOrderItemRequest;
import si.plaan.dto.response.CustomerResponse;
import si.plaan.dto.response.GoodsReceiptResponse;
import si.plaan.dto.response.ItemResponse;
import si.plaan.dto.response.PurchaseOrderResponse;
import si.plaan.dto.response.SalesOrderResponse;
import si.plaan.dto.response.SalesOrderStockAvailabilityItemResponse;
import si.plaan.dto.response.SalesOrderStockAvailabilityResponse;
import si.plaan.dto.response.SupplierResponse;
import si.plaan.dto.response.WarehouseResponse;
import si.plaan.entity.GoodsReceiptStatus;
import si.plaan.entity.Organization;
import si.plaan.entity.PurchaseOrderStatus;
import si.plaan.entity.SalesOrderStatus;
import si.plaan.repository.OrganizationRepository;
import si.plaan.repository.StockMovementRepository;
import si.plaan.service.CustomerService;
import si.plaan.service.GoodsReceiptService;
import si.plaan.service.ItemService;
import si.plaan.service.PurchaseOrderService;
import si.plaan.service.SalesOrderService;
import si.plaan.service.SupplierService;
import si.plaan.service.WarehouseService;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@SpringBootTest
@Transactional
public class SalesStockAvailabilityTests {

    @Autowired
    private SalesOrderService salesOrderService;

    @Autowired
    private CustomerService customerService;

    @Autowired
    private WarehouseService warehouseService;

    @Autowired
    private ItemService itemService;

    @Autowired
    private SupplierService supplierService;

    @Autowired
    private PurchaseOrderService purchaseOrderService;

    @Autowired
    private GoodsReceiptService goodsReceiptService;

    @Autowired
    private OrganizationRepository organizationRepository;

    @Autowired
    private StockMovementRepository stockMovementRepository;

    private Organization orgA;
    private Organization orgB;
    private CustomerResponse customerA;
    private WarehouseResponse fgWarehouseA;
    private WarehouseResponse otherWarehouseA;
    private ItemResponse tableItem;
    private ItemResponse chairItem;
    private ItemResponse doorItem;

    @BeforeEach
    void setUp() {
        orgA = organizationRepository.save(Organization.builder()
                .name("Avail Test Org A")
                .slug("avail-a-" + UUID.randomUUID().toString().substring(0, 8))
                .country("India")
                .baseCurrency("INR")
                .timeZone("Asia/Kolkata")
                .active(true)
                .build());

        orgB = organizationRepository.save(Organization.builder()
                .name("Avail Test Org B")
                .slug("avail-b-" + UUID.randomUUID().toString().substring(0, 8))
                .country("USA")
                .baseCurrency("USD")
                .timeZone("UTC")
                .active(true)
                .build());

        customerA = customerService.createCustomer(orgA.getId(), new CreateCustomerRequest(
                "CUS-001", "ABC Furniture", "Ravi Kumar", "+91 9876543210", "ravi@abcfurniture.com",
                "Industrial Area, Ongole", "Industrial Area, Ongole", null, true
        ));

        fgWarehouseA = warehouseService.createWarehouse(orgA.getId(), new CreateWarehouseRequest(
                "WH-FG", "Finished Goods Store", "Bangalore", "FG Warehouse", true
        ));

        otherWarehouseA = warehouseService.createWarehouse(orgA.getId(), new CreateWarehouseRequest(
                "WH-OTHER", "Other Store", "Bangalore", "Other Warehouse", true
        ));

        tableItem = itemService.createItem(orgA.getId(), new CreateItemRequest(
                "ITEM-TAB", "Wooden Table", null, "Finished Goods", null, null, "Nos", "Table", true
        ));

        chairItem = itemService.createItem(orgA.getId(), new CreateItemRequest(
                "ITEM-CHR", "Wooden Chair", null, "Finished Goods", null, null, "Nos", "Chair", true
        ));

        doorItem = itemService.createItem(orgA.getId(), new CreateItemRequest(
                "ITEM-DOR", "Wooden Door", null, "Finished Goods", null, null, "Nos", "Door", true
        ));
    }

    private void addStockViaGoodsReceipt(Long orgId, Long warehouseId, Long itemId, BigDecimal qty) {
        SupplierResponse supplier = supplierService.createSupplier(orgId, new CreateSupplierRequest(
                null, "Stock Supplier", null, null, null, null, null, true
        ));

        PurchaseOrderResponse po = purchaseOrderService.createPurchaseOrder(orgId, new CreatePurchaseOrderRequest(
                null, supplier.id(), warehouseId, LocalDate.now(), null, "Stock setup", PurchaseOrderStatus.DRAFT,
                List.of(new PurchaseOrderItemRequest(itemId, qty, BigDecimal.TEN))
        ));
        purchaseOrderService.updateStatus(orgId, po.id(), PurchaseOrderStatus.ISSUED);

        GoodsReceiptResponse gr = goodsReceiptService.createGoodsReceipt(orgId, new CreateGoodsReceiptRequest(
                null, po.id(), LocalDate.now(), null, "Initial stock", GoodsReceiptStatus.DRAFT,
                List.of(new GoodsReceiptItemRequest(po.items().get(0).id(), itemId, qty))
        ));
        goodsReceiptService.postGoodsReceipt(orgId, gr.id());
    }

    @Test
    void testStockAvailabilityMatchesExampleScenario() {
        // Example scenario from prompt:
        // Item         Ordered  On Hand  Shortage  Status
        // Wooden Table 10       15       0         Available
        // Wooden Chair 20       12       8         Partial
        // Wooden Door  5        0        5         Unavailable

        // Provide 15 tables and 12 chairs in fgWarehouseA
        addStockViaGoodsReceipt(orgA.getId(), fgWarehouseA.id(), tableItem.id(), new BigDecimal("15.000"));
        addStockViaGoodsReceipt(orgA.getId(), fgWarehouseA.id(), chairItem.id(), new BigDecimal("12.000"));
        // 0 doors in fgWarehouseA

        // Create Sales Order for 10 tables, 20 chairs, 5 doors
        SalesOrderResponse order = salesOrderService.createSalesOrder(orgA.getId(), new CreateSalesOrderRequest(
                "SO-001", customerA.id(), fgWarehouseA.id(), LocalDate.now(), null, null, null, null, null,
                SalesOrderStatus.DRAFT,
                List.of(
                        new SalesOrderItemRequest(null, tableItem.id(), new BigDecimal("10.000"), new BigDecimal("2500.00")),
                        new SalesOrderItemRequest(null, chairItem.id(), new BigDecimal("20.000"), new BigDecimal("1200.00")),
                        new SalesOrderItemRequest(null, doorItem.id(), new BigDecimal("5.000"), new BigDecimal("3500.00"))
                )
        ));

        salesOrderService.confirmSalesOrder(orgA.getId(), order.id());

        long countBefore = stockMovementRepository.count();

        // Check availability
        SalesOrderStockAvailabilityResponse avail = salesOrderService.checkStockAvailability(orgA.getId(), order.id());

        // Zero stock movements generated
        Assertions.assertEquals(countBefore, stockMovementRepository.count());

        Assertions.assertEquals(order.id(), avail.getSalesOrderId());
        Assertions.assertEquals("SO-001", avail.getOrderNumber());
        Assertions.assertEquals(fgWarehouseA.id(), avail.getDispatchWarehouseId());
        Assertions.assertEquals("STOCK_SHORTAGE", avail.getOverallStatus());
        Assertions.assertEquals(3, avail.getTotalItems());
        Assertions.assertEquals(1, avail.getAvailableItems());
        Assertions.assertEquals(2, avail.getShortageItems());

        // Table
        SalesOrderStockAvailabilityItemResponse tableAvail = avail.getItems().stream()
                .filter(i -> i.getItemId().equals(tableItem.id())).findFirst().orElseThrow();
        Assertions.assertEquals(new BigDecimal("10.000"), tableAvail.getOrderedQuantity());
        Assertions.assertEquals(new BigDecimal("15.000"), tableAvail.getOnHandQuantity());
        Assertions.assertEquals(BigDecimal.ZERO, tableAvail.getShortageQuantity());
        Assertions.assertEquals("AVAILABLE", tableAvail.getStatus());

        // Chair
        SalesOrderStockAvailabilityItemResponse chairAvail = avail.getItems().stream()
                .filter(i -> i.getItemId().equals(chairItem.id())).findFirst().orElseThrow();
        Assertions.assertEquals(new BigDecimal("20.000"), chairAvail.getOrderedQuantity());
        Assertions.assertEquals(new BigDecimal("12.000"), chairAvail.getOnHandQuantity());
        Assertions.assertEquals(new BigDecimal("8.000"), chairAvail.getShortageQuantity());
        Assertions.assertEquals("PARTIALLY_AVAILABLE", chairAvail.getStatus());

        // Door
        SalesOrderStockAvailabilityItemResponse doorAvail = avail.getItems().stream()
                .filter(i -> i.getItemId().equals(doorItem.id())).findFirst().orElseThrow();
        Assertions.assertEquals(new BigDecimal("5.000"), doorAvail.getOrderedQuantity());
        Assertions.assertEquals(BigDecimal.ZERO, doorAvail.getOnHandQuantity());
        Assertions.assertEquals(new BigDecimal("5.000"), doorAvail.getShortageQuantity());
        Assertions.assertEquals("NOT_AVAILABLE", doorAvail.getStatus());
    }

    @Test
    void testCheckOnlySelectedDispatchWarehouse() {
        // Stock of 50 tables placed in otherWarehouseA, NOT in fgWarehouseA
        addStockViaGoodsReceipt(orgA.getId(), otherWarehouseA.id(), tableItem.id(), new BigDecimal("50.000"));

        // Order dispatch warehouse is fgWarehouseA
        SalesOrderResponse order = salesOrderService.createSalesOrder(orgA.getId(), new CreateSalesOrderRequest(
                null, customerA.id(), fgWarehouseA.id(), LocalDate.now(), null, null, null, null, null,
                SalesOrderStatus.DRAFT,
                List.of(new SalesOrderItemRequest(null, tableItem.id(), new BigDecimal("10.000"), new BigDecimal("2500.00")))
        ));

        SalesOrderStockAvailabilityResponse avail = salesOrderService.checkStockAvailability(orgA.getId(), order.id());

        // Stock in fgWarehouseA should be 0, shortage should be 10, status NOT_AVAILABLE
        SalesOrderStockAvailabilityItemResponse itemAvail = avail.getItems().get(0);
        Assertions.assertEquals(BigDecimal.ZERO, itemAvail.getOnHandQuantity());
        Assertions.assertEquals(new BigDecimal("10.000"), itemAvail.getShortageQuantity());
        Assertions.assertEquals("NOT_AVAILABLE", itemAvail.getStatus());
        Assertions.assertEquals("STOCK_SHORTAGE", avail.getOverallStatus());
    }

    @Test
    void testOverallStatusWhenAllAvailable() {
        // Add 10 tables to fgWarehouseA
        addStockViaGoodsReceipt(orgA.getId(), fgWarehouseA.id(), tableItem.id(), new BigDecimal("10.000"));

        SalesOrderResponse order = salesOrderService.createSalesOrder(orgA.getId(), new CreateSalesOrderRequest(
                null, customerA.id(), fgWarehouseA.id(), LocalDate.now(), null, null, null, null, null,
                SalesOrderStatus.DRAFT,
                List.of(new SalesOrderItemRequest(null, tableItem.id(), new BigDecimal("10.000"), new BigDecimal("2500.00")))
        ));

        SalesOrderStockAvailabilityResponse avail = salesOrderService.checkStockAvailability(orgA.getId(), order.id());
        Assertions.assertEquals("AVAILABLE", avail.getOverallStatus());
        Assertions.assertEquals(0, avail.getShortageItems());
        Assertions.assertEquals(1, avail.getAvailableItems());
        Assertions.assertEquals("AVAILABLE", avail.getItems().get(0).getStatus());
    }

    @Test
    void testTenantIsolation() {
        SalesOrderResponse orderA = salesOrderService.createSalesOrder(orgA.getId(), new CreateSalesOrderRequest(
                null, customerA.id(), fgWarehouseA.id(), LocalDate.now(), null, null, null, null, null,
                SalesOrderStatus.DRAFT,
                List.of(new SalesOrderItemRequest(null, tableItem.id(), new BigDecimal("10.000"), new BigDecimal("2500.00")))
        ));

        // Org B cannot check availability for Org A order
        Assertions.assertThrows(Exception.class, () ->
                salesOrderService.checkStockAvailability(orgB.getId(), orderA.id()));
    }
}
