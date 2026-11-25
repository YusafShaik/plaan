package si.plaan;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.request.CreateCustomerRequest;
import si.plaan.dto.request.CreateItemRequest;
import si.plaan.dto.request.CreateSalesOrderRequest;
import si.plaan.dto.request.CreateWarehouseRequest;
import si.plaan.dto.request.SalesOrderItemRequest;
import si.plaan.dto.request.UpdateSalesOrderRequest;
import si.plaan.dto.response.CustomerResponse;
import si.plaan.dto.response.ItemResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.dto.response.SalesOrderResponse;
import si.plaan.dto.response.SalesOrderSummaryResponse;
import si.plaan.dto.response.WarehouseResponse;
import si.plaan.entity.Customer;
import si.plaan.entity.Item;
import si.plaan.entity.Organization;
import si.plaan.entity.SalesOrderStatus;
import si.plaan.entity.Warehouse;
import si.plaan.repository.OrganizationRepository;
import si.plaan.repository.StockMovementRepository;
import si.plaan.service.CustomerService;
import si.plaan.service.ItemService;
import si.plaan.service.SalesOrderService;
import si.plaan.service.WarehouseService;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@SpringBootTest
@Transactional
public class SalesOrderServiceTests {

    @Autowired
    private SalesOrderService salesOrderService;

    @Autowired
    private CustomerService customerService;

    @Autowired
    private WarehouseService warehouseService;

    @Autowired
    private ItemService itemService;

    @Autowired
    private OrganizationRepository organizationRepository;

    @Autowired
    private StockMovementRepository stockMovementRepository;

    private Organization orgA;
    private Organization orgB;
    private Customer customerA;
    private Warehouse warehouseA;
    private Item tableItem;
    private Item chairItem;

    @BeforeEach
    void setUp() {
        orgA = organizationRepository.save(Organization.builder()
                .name("Sales Org A")
                .slug("sales-a-" + UUID.randomUUID().toString().substring(0, 8))
                .country("India")
                .baseCurrency("INR")
                .timeZone("Asia/Kolkata")
                .active(true)
                .build());

        orgB = organizationRepository.save(Organization.builder()
                .name("Sales Org B")
                .slug("sales-b-" + UUID.randomUUID().toString().substring(0, 8))
                .country("USA")
                .baseCurrency("USD")
                .timeZone("UTC")
                .active(true)
                .build());

        // Setup Customer in Org A
        CustomerResponse custRes = customerService.createCustomer(orgA.getId(), new CreateCustomerRequest(
                "CUS-001",
                "ABC Furniture",
                "Ravi Kumar",
                "+91 9876543210",
                "ravi@abcfurniture.com",
                "Industrial Area, Ongole",
                "Industrial Area, Ongole - Shipping Dock",
                "29ABCDE1234F1Z5",
                true
        ));
        customerA = new Customer();
        customerA.setId(custRes.id());

        // Setup Warehouse in Org A
        WarehouseResponse whRes = warehouseService.createWarehouse(orgA.getId(), new CreateWarehouseRequest(
                "WH-FG", "Finished Goods Store", "Bangalore", "Storage for finished goods", true
        ));
        warehouseA = new Warehouse();
        warehouseA.setId(whRes.id());

        // Setup Items in Org A
        ItemResponse item1 = itemService.createItem(orgA.getId(), new CreateItemRequest(
                "ITEM-TAB", "Wooden Table", null, "Finished Goods", null, null, "Nos", "Dining wooden table", true
        ));
        tableItem = new Item();
        tableItem.setId(item1.id());
        tableItem.setUnitOfMeasure("Nos");

        ItemResponse item2 = itemService.createItem(orgA.getId(), new CreateItemRequest(
                "ITEM-CHR", "Wooden Chair", null, "Finished Goods", null, null, "Nos", "Wooden chair", true
        ));
        chairItem = new Item();
        chairItem.setId(item2.id());
        chairItem.setUnitOfMeasure("Nos");
    }

    @Test
    void testCreateDraftSalesOrderAndCalculations() {
        String nextNo = salesOrderService.getNextSalesOrderNumber(orgA.getId());
        Assertions.assertTrue(nextNo.startsWith("SO-"));

        List<SalesOrderItemRequest> items = List.of(
                new SalesOrderItemRequest(null, tableItem.getId(), new BigDecimal("10.000"), new BigDecimal("2500.00")),
                new SalesOrderItemRequest(null, chairItem.getId(), new BigDecimal("20.000"), new BigDecimal("1200.00"))
        );

        CreateSalesOrderRequest request = new CreateSalesOrderRequest(
                null,
                customerA.getId(),
                warehouseA.getId(),
                LocalDate.now(),
                LocalDate.now().plusDays(7),
                "PO-REF-101",
                null, // will populate from customer
                null, // will populate from customer
                "Please deliver on pallets",
                SalesOrderStatus.DRAFT,
                items
        );

        SalesOrderResponse response = salesOrderService.createSalesOrder(orgA.getId(), request);

        Assertions.assertNotNull(response.id());
        Assertions.assertEquals(nextNo, response.orderNumber());
        Assertions.assertEquals("ABC Furniture", response.customerName());
        Assertions.assertEquals("Finished Goods Store", response.warehouseName());
        Assertions.assertEquals(SalesOrderStatus.DRAFT, response.status());
        Assertions.assertEquals("Industrial Area, Ongole", response.billingAddress());
        Assertions.assertEquals("Industrial Area, Ongole - Shipping Dock", response.shippingAddress());
        Assertions.assertEquals("PO-REF-101", response.customerPoReference());

        // Line amounts and total
        // 10 * 2500 = 25000; 20 * 1200 = 24000; Total = 49000
        Assertions.assertEquals(2, response.items().size());
        Assertions.assertEquals(new BigDecimal("25000.00"), response.items().get(0).lineAmount());
        Assertions.assertEquals(new BigDecimal("24000.00"), response.items().get(1).lineAmount());
        Assertions.assertEquals(new BigDecimal("49000.00"), response.totalAmount());
        Assertions.assertEquals("Nos", response.items().get(0).unitOfMeasure());
    }

    @Test
    void testPreventDuplicateItemsInOrder() {
        List<SalesOrderItemRequest> items = List.of(
                new SalesOrderItemRequest(null, tableItem.getId(), new BigDecimal("5.000"), new BigDecimal("2000.00")),
                new SalesOrderItemRequest(null, tableItem.getId(), new BigDecimal("3.000"), new BigDecimal("2100.00"))
        );

        CreateSalesOrderRequest request = new CreateSalesOrderRequest(
                null, customerA.getId(), warehouseA.getId(), LocalDate.now(), null, null, null, null, null,
                SalesOrderStatus.DRAFT, items
        );

        IllegalArgumentException ex = Assertions.assertThrows(
                IllegalArgumentException.class,
                () -> salesOrderService.createSalesOrder(orgA.getId(), request)
        );
        Assertions.assertTrue(ex.getMessage().contains("Duplicate item found"));
    }

    @Test
    void testConfirmSalesOrderLifecycleAndEditRestrictions() {
        long initialMovements = stockMovementRepository.count();

        List<SalesOrderItemRequest> items = List.of(
                new SalesOrderItemRequest(null, tableItem.getId(), new BigDecimal("10.000"), new BigDecimal("2500.00"))
        );

        CreateSalesOrderRequest request = new CreateSalesOrderRequest(
                null, customerA.getId(), warehouseA.getId(), LocalDate.now(), null, null, null, null, null,
                SalesOrderStatus.DRAFT, items
        );
        SalesOrderResponse draftOrder = salesOrderService.createSalesOrder(orgA.getId(), request);
        Assertions.assertEquals(SalesOrderStatus.DRAFT, draftOrder.status());

        // Update draft order
        UpdateSalesOrderRequest updateReq = new UpdateSalesOrderRequest(
                customerA.getId(),
                warehouseA.getId(),
                LocalDate.now(),
                null,
                "PO-UPDATED",
                "Custom Billing Address",
                "Custom Shipping Address",
                "Updated Notes",
                List.of(new SalesOrderItemRequest(null, tableItem.getId(), new BigDecimal("12.000"), new BigDecimal("2500.00")))
        );
        SalesOrderResponse updated = salesOrderService.updateSalesOrder(orgA.getId(), draftOrder.id(), updateReq);
        Assertions.assertEquals(new BigDecimal("30000.00"), updated.totalAmount());
        Assertions.assertEquals("Custom Shipping Address", updated.shippingAddress());

        // Confirm order
        SalesOrderResponse confirmed = salesOrderService.confirmSalesOrder(orgA.getId(), draftOrder.id());
        Assertions.assertEquals(SalesOrderStatus.CONFIRMED, confirmed.status());

        // Verify NO stock movements or financial changes generated
        long currentMovements = stockMovementRepository.count();
        Assertions.assertEquals(initialMovements, currentMovements);

        // Confirmed orders cannot be edited
        Assertions.assertThrows(IllegalStateException.class, () ->
                salesOrderService.updateSalesOrder(orgA.getId(), draftOrder.id(), updateReq));

        // Confirmed orders cannot be deleted
        Assertions.assertThrows(IllegalStateException.class, () ->
                salesOrderService.deleteSalesOrder(orgA.getId(), draftOrder.id()));

        // Confirmed order can be cancelled
        SalesOrderResponse cancelled = salesOrderService.cancelSalesOrder(orgA.getId(), draftOrder.id());
        Assertions.assertEquals(SalesOrderStatus.CANCELLED, cancelled.status());
    }

    @Test
    void testCustomerReferencedBySalesOrderCannotBeDeleted() {
        List<SalesOrderItemRequest> items = List.of(
                new SalesOrderItemRequest(null, tableItem.getId(), new BigDecimal("2.000"), new BigDecimal("2500.00"))
        );
        salesOrderService.createSalesOrder(orgA.getId(), new CreateSalesOrderRequest(
                null, customerA.getId(), warehouseA.getId(), LocalDate.now(), null, null, null, null, null,
                SalesOrderStatus.DRAFT, items
        ));

        // Attempt to delete customerA should fail
        IllegalStateException ex = Assertions.assertThrows(IllegalStateException.class, () ->
                customerService.deleteCustomer(orgA.getId(), customerA.getId()));
        Assertions.assertTrue(ex.getMessage().contains("referenced in sales transactions"));
    }

    @Test
    void testTenantDataIsolation() {
        CustomerResponse custB = customerService.createCustomer(orgB.getId(), new CreateCustomerRequest(
                "CUS-B01", "Tenant B Customer", null, null, null, null, null, null, true
        ));
        WarehouseResponse whB = warehouseService.createWarehouse(orgB.getId(), new CreateWarehouseRequest(
                "WH-B", "Tenant B WH", "Location B", null, true
        ));
        ItemResponse itemB = itemService.createItem(orgB.getId(), new CreateItemRequest(
                "ITEM-B", "Tenant B Item", null, "Finished Goods", null, null, "Nos", null, true
        ));

        // Org A creates SO-100
        SalesOrderResponse orderA = salesOrderService.createSalesOrder(orgA.getId(), new CreateSalesOrderRequest(
                "SO-100", customerA.getId(), warehouseA.getId(), LocalDate.now(), null, null, null, null, null,
                SalesOrderStatus.DRAFT, List.of(new SalesOrderItemRequest(null, tableItem.getId(), BigDecimal.ONE, BigDecimal.TEN))
        ));

        // Org B can create identical SO-100 without clash
        SalesOrderResponse orderB = salesOrderService.createSalesOrder(orgB.getId(), new CreateSalesOrderRequest(
                "SO-100", custB.id(), whB.id(), LocalDate.now(), null, null, null, null, null,
                SalesOrderStatus.DRAFT, List.of(new SalesOrderItemRequest(null, itemB.id(), BigDecimal.ONE, BigDecimal.TEN))
        ));

        Assertions.assertNotNull(orderA.id());
        Assertions.assertNotNull(orderB.id());
        Assertions.assertNotEquals(orderA.id(), orderB.id());

        // Org A cannot see Org B order
        Assertions.assertThrows(Exception.class, () ->
                salesOrderService.getSalesOrderById(orgA.getId(), orderB.id()));

        // Org A cannot confirm Org B order
        Assertions.assertThrows(Exception.class, () ->
                salesOrderService.confirmSalesOrder(orgA.getId(), orderB.id()));

        // Querying orders for Org A returns only Org A's orders
        PageResponse<SalesOrderResponse> pageA = salesOrderService.getSalesOrders(
                orgA.getId(), null, null, null, PageRequest.of(0, 10));
        Assertions.assertEquals(1, pageA.totalElements());
    }

    @Test
    void testSummaryAndSearch() {
        List<SalesOrderItemRequest> items = List.of(
                new SalesOrderItemRequest(null, tableItem.getId(), new BigDecimal("10.000"), new BigDecimal("2500.00"))
        );

        SalesOrderResponse so1 = salesOrderService.createSalesOrder(orgA.getId(), new CreateSalesOrderRequest(
                "SO-001", customerA.getId(), warehouseA.getId(), LocalDate.now(), null, "REF-ABC", null, null, null,
                SalesOrderStatus.DRAFT, items
        ));
        salesOrderService.confirmSalesOrder(orgA.getId(), so1.id());

        salesOrderService.createSalesOrder(orgA.getId(), new CreateSalesOrderRequest(
                "SO-002", customerA.getId(), warehouseA.getId(), LocalDate.now(), null, "REF-XYZ", null, null, null,
                SalesOrderStatus.DRAFT, items
        ));

        SalesOrderSummaryResponse summary = salesOrderService.getSummary(orgA.getId());
        Assertions.assertEquals(2, summary.totalOrders());
        Assertions.assertEquals(1, summary.draftOrders());
        Assertions.assertEquals(1, summary.confirmedOrders());
        Assertions.assertEquals(new BigDecimal("50000.00"), summary.totalValue());

        // Search by order number
        PageResponse<SalesOrderResponse> searchRes = salesOrderService.getSalesOrders(
                orgA.getId(), "SO-001", null, null, PageRequest.of(0, 10));
        Assertions.assertEquals(1, searchRes.totalElements());
        Assertions.assertEquals("SO-001", searchRes.content().get(0).orderNumber());
    }
}
