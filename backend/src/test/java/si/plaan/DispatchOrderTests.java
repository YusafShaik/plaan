package si.plaan;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.request.CreateCustomerRequest;
import si.plaan.dto.request.CreateDispatchOrderRequest;
import si.plaan.dto.request.CreateGoodsReceiptRequest;
import si.plaan.dto.request.CreateItemRequest;
import si.plaan.dto.request.CreatePurchaseOrderRequest;
import si.plaan.dto.request.CreateSalesOrderRequest;
import si.plaan.dto.request.CreateSupplierRequest;
import si.plaan.dto.request.CreateWarehouseRequest;
import si.plaan.dto.request.DispatchOrderItemRequest;
import si.plaan.dto.request.GoodsReceiptItemRequest;
import si.plaan.dto.request.PurchaseOrderItemRequest;
import si.plaan.dto.request.SalesOrderItemRequest;
import si.plaan.dto.request.UpdateDispatchOrderRequest;
import si.plaan.dto.response.CustomerResponse;
import si.plaan.dto.response.DispatchOrderResponse;
import si.plaan.dto.response.GoodsReceiptResponse;
import si.plaan.dto.response.ItemResponse;
import si.plaan.dto.response.PurchaseOrderResponse;
import si.plaan.dto.response.SalesOrderResponse;
import si.plaan.dto.response.SalesOrderStockAvailabilityResponse;
import si.plaan.dto.response.StockLedgerResponse;
import si.plaan.dto.response.SupplierResponse;
import si.plaan.dto.response.WarehouseResponse;
import si.plaan.entity.DispatchOrderStatus;
import si.plaan.entity.GoodsReceiptStatus;
import si.plaan.entity.Organization;
import si.plaan.entity.PurchaseOrderStatus;
import si.plaan.entity.SalesOrderStatus;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.OrganizationRepository;
import si.plaan.repository.StockMovementRepository;
import si.plaan.service.CustomerService;
import si.plaan.service.DispatchOrderService;
import si.plaan.service.GoodsReceiptService;
import si.plaan.service.InventoryService;
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
public class DispatchOrderTests {

    @Autowired
    private DispatchOrderService dispatchOrderService;

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
    private InventoryService inventoryService;

    @Autowired
    private StockMovementRepository stockMovementRepository;

    @Autowired
    private OrganizationRepository organizationRepository;

    private Organization orgA;
    private Organization orgB;
    private CustomerResponse customerA;
    private WarehouseResponse fgWarehouseA;
    private ItemResponse tableItem;
    private ItemResponse chairItem;
    private ItemResponse doorItem;

    @BeforeEach
    void setUp() {
        orgA = organizationRepository.save(Organization.builder()
                .name("Dispatch Test Org A")
                .slug("disp-a-" + UUID.randomUUID().toString().substring(0, 8))
                .country("India")
                .baseCurrency("INR")
                .timeZone("Asia/Kolkata")
                .active(true)
                .build());

        orgB = organizationRepository.save(Organization.builder()
                .name("Dispatch Test Org B")
                .slug("disp-b-" + UUID.randomUUID().toString().substring(0, 8))
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
                null, "Supplier " + UUID.randomUUID(), null, null, null, null, null, true
        ));

        PurchaseOrderResponse po = purchaseOrderService.createPurchaseOrder(orgId, new CreatePurchaseOrderRequest(
                null, supplier.id(), warehouseId, LocalDate.now(), null, "Stock setup", PurchaseOrderStatus.DRAFT,
                List.of(new PurchaseOrderItemRequest(itemId, qty, BigDecimal.TEN))
        ));
        purchaseOrderService.updateStatus(orgId, po.id(), PurchaseOrderStatus.ISSUED);

        GoodsReceiptResponse gr = goodsReceiptService.createGoodsReceipt(orgId, new CreateGoodsReceiptRequest(
                null, po.id(), LocalDate.now(), null, "Stock setup", GoodsReceiptStatus.DRAFT,
                List.of(new GoodsReceiptItemRequest(po.items().get(0).id(), itemId, qty))
        ));
        goodsReceiptService.postGoodsReceipt(orgId, gr.id());
    }

    @Test
    void testDispatchEndToEndWorkflowMatchingScreenshotScenario() {
        // Step 1: Stock 15 tables and 12 chairs into fgWarehouseA (0 doors)
        addStockViaGoodsReceipt(orgA.getId(), fgWarehouseA.id(), tableItem.id(), new BigDecimal("15.000"));
        addStockViaGoodsReceipt(orgA.getId(), fgWarehouseA.id(), chairItem.id(), new BigDecimal("12.000"));

        BigDecimal initialTableStock = stockMovementRepository.getCurrentStockForItemAndWarehouse(orgA.getId(), tableItem.id(), fgWarehouseA.id());
        BigDecimal initialChairStock = stockMovementRepository.getCurrentStockForItemAndWarehouse(orgA.getId(), chairItem.id(), fgWarehouseA.id());
        BigDecimal initialDoorStock = stockMovementRepository.getCurrentStockForItemAndWarehouse(orgA.getId(), doorItem.id(), fgWarehouseA.id());

        Assertions.assertEquals(0, new BigDecimal("15.000").compareTo(initialTableStock));
        Assertions.assertEquals(0, new BigDecimal("12.000").compareTo(initialChairStock));
        Assertions.assertEquals(0, BigDecimal.ZERO.compareTo(initialDoorStock));

        // Step 2: Create Sales Order for 10 tables, 20 chairs, 5 doors and confirm it
        SalesOrderResponse order = salesOrderService.createSalesOrder(orgA.getId(), new CreateSalesOrderRequest(
                null,
                customerA.id(),
                fgWarehouseA.id(),
                LocalDate.now(),
                LocalDate.now().plusDays(7),
                "PO-REF-101",
                "ABC Furniture Billing",
                "ABC Furniture, Industrial Area, Ongole",
                "Urgent delivery",
                SalesOrderStatus.DRAFT,
                List.of(
                        new SalesOrderItemRequest(null, tableItem.id(), new BigDecimal("10.000"), new BigDecimal("2500.00")),
                        new SalesOrderItemRequest(null, chairItem.id(), new BigDecimal("20.000"), new BigDecimal("1200.00")),
                        new SalesOrderItemRequest(null, doorItem.id(), new BigDecimal("5.000"), new BigDecimal("3500.00"))
                )
        ));

        order = salesOrderService.confirmSalesOrder(orgA.getId(), order.id());
        Assertions.assertEquals(SalesOrderStatus.CONFIRMED, order.status());

        Long tableSoItemId = order.items().stream().filter(i -> i.itemId().equals(tableItem.id())).findFirst().get().id();
        Long chairSoItemId = order.items().stream().filter(i -> i.itemId().equals(chairItem.id())).findFirst().get().id();
        Long doorSoItemId = order.items().stream().filter(i -> i.itemId().equals(doorItem.id())).findFirst().get().id();

        // Step 3: Create and Post Dispatch DO-001 (10 tables, 12 chairs, 0 doors)
        DispatchOrderResponse dispatch = dispatchOrderService.createDispatchOrder(orgA.getId(), new CreateDispatchOrderRequest(
                null,
                order.id(),
                LocalDate.now(),
                "ABC Furniture, Industrial Area, Ongole",
                "Express Logistics",
                "AP-27-TY-1001",
                "LR-9988",
                "Partial shipment of available finished goods",
                DispatchOrderStatus.POSTED,
                List.of(
                        new DispatchOrderItemRequest(tableSoItemId, tableItem.id(), new BigDecimal("10.000")),
                        new DispatchOrderItemRequest(chairSoItemId, chairItem.id(), new BigDecimal("12.000")),
                        new DispatchOrderItemRequest(doorSoItemId, doorItem.id(), BigDecimal.ZERO)
                )
        ));

        Assertions.assertEquals(DispatchOrderStatus.POSTED, dispatch.status());
        Assertions.assertNotNull(dispatch.dispatchNumber());
        Assertions.assertTrue(dispatch.dispatchNumber().startsWith("DO-"));
        Assertions.assertEquals(0, new BigDecimal("22.000").compareTo(dispatch.totalQuantityDispatched()));

        // Step 4: Verify remaining stock in warehouse
        // Wooden Table: 15 - 10 = 5
        // Wooden Chair: 12 - 12 = 0
        // Wooden Door: 0 - 0 = 0
        BigDecimal remainingTableStock = stockMovementRepository.getCurrentStockForItemAndWarehouse(orgA.getId(), tableItem.id(), fgWarehouseA.id());
        BigDecimal remainingChairStock = stockMovementRepository.getCurrentStockForItemAndWarehouse(orgA.getId(), chairItem.id(), fgWarehouseA.id());
        BigDecimal remainingDoorStock = stockMovementRepository.getCurrentStockForItemAndWarehouse(orgA.getId(), doorItem.id(), fgWarehouseA.id());

        Assertions.assertEquals(0, new BigDecimal("5.000").compareTo(remainingTableStock));
        Assertions.assertEquals(0, BigDecimal.ZERO.compareTo(remainingChairStock));
        Assertions.assertEquals(0, BigDecimal.ZERO.compareTo(remainingDoorStock));

        // Step 5: Verify Sales Order status and fulfillment quantities
        SalesOrderResponse refreshedOrder = salesOrderService.getSalesOrderById(orgA.getId(), order.id());
        Assertions.assertEquals(SalesOrderStatus.PARTIALLY_DISPATCHED, refreshedOrder.status());

        var tableLine = refreshedOrder.items().stream().filter(i -> i.itemId().equals(tableItem.id())).findFirst().get();
        var chairLine = refreshedOrder.items().stream().filter(i -> i.itemId().equals(chairItem.id())).findFirst().get();
        var doorLine = refreshedOrder.items().stream().filter(i -> i.itemId().equals(doorItem.id())).findFirst().get();

        Assertions.assertEquals(0, new BigDecimal("10.000").compareTo(tableLine.dispatchedQuantity()));
        Assertions.assertEquals(0, BigDecimal.ZERO.compareTo(tableLine.pendingQuantity()));

        Assertions.assertEquals(0, new BigDecimal("12.000").compareTo(chairLine.dispatchedQuantity()));
        Assertions.assertEquals(0, new BigDecimal("8.000").compareTo(chairLine.pendingQuantity()));

        Assertions.assertEquals(0, BigDecimal.ZERO.compareTo(doorLine.dispatchedQuantity()));
        Assertions.assertEquals(0, new BigDecimal("5.000").compareTo(doorLine.pendingQuantity()));

        // Step 6: Verify Stock Availability Check uses Pending Quantity
        SalesOrderStockAvailabilityResponse availability = salesOrderService.checkStockAvailability(orgA.getId(), order.id());
        Assertions.assertEquals("STOCK_SHORTAGE", availability.getOverallStatus());

        var availTable = availability.getItems().stream().filter(i -> i.getItemId().equals(tableItem.id())).findFirst().get();
        var availChair = availability.getItems().stream().filter(i -> i.getItemId().equals(chairItem.id())).findFirst().get();
        var availDoor = availability.getItems().stream().filter(i -> i.getItemId().equals(doorItem.id())).findFirst().get();

        // Table: Pending = 0, Shortage = 0, Status = AVAILABLE
        Assertions.assertEquals(0, BigDecimal.ZERO.compareTo(availTable.getPendingQuantity()));
        Assertions.assertEquals(0, BigDecimal.ZERO.compareTo(availTable.getShortageQuantity()));
        Assertions.assertEquals("AVAILABLE", availTable.getStatus());

        // Chair: Pending = 8, OnHand = 0, Shortage = 8, Status = NOT_AVAILABLE
        Assertions.assertEquals(0, new BigDecimal("8.000").compareTo(availChair.getPendingQuantity()));
        Assertions.assertEquals(0, new BigDecimal("8.000").compareTo(availChair.getShortageQuantity()));
        Assertions.assertEquals("NOT_AVAILABLE", availChair.getStatus());

        // Door: Pending = 5, OnHand = 0, Shortage = 5, Status = NOT_AVAILABLE
        Assertions.assertEquals(0, new BigDecimal("5.000").compareTo(availDoor.getPendingQuantity()));
        Assertions.assertEquals(0, new BigDecimal("5.000").compareTo(availDoor.getShortageQuantity()));
        Assertions.assertEquals("NOT_AVAILABLE", availDoor.getStatus());

        // Step 7: Verify Stock Ledger reflects "Sales Dispatch"
        StockLedgerResponse ledger = inventoryService.getStockLedger(orgA.getId(), tableItem.id(), fgWarehouseA.id());
        Assertions.assertFalse(ledger.movements().isEmpty());
        var lastEntry = ledger.movements().get(ledger.movements().size() - 1);
        Assertions.assertEquals("Sales Dispatch", lastEntry.transactionType());
        Assertions.assertEquals(dispatch.dispatchNumber(), lastEntry.referenceNumber());
        Assertions.assertEquals(0, new BigDecimal("10.000").compareTo(lastEntry.quantityOut()));
        Assertions.assertEquals(0, new BigDecimal("5.000").compareTo(lastEntry.runningBalance()));

        // Step 8: Verify Sales Order with posted dispatch cannot be cancelled
        final Long orderId = order.id();
        Assertions.assertThrows(IllegalStateException.class, () -> salesOrderService.cancelSalesOrder(orgA.getId(), orderId));

        // Step 9: Complete the fulfillment with a second dispatch DO-002
        // Provide stock for remaining 8 chairs and 5 doors
        addStockViaGoodsReceipt(orgA.getId(), fgWarehouseA.id(), chairItem.id(), new BigDecimal("8.000"));
        addStockViaGoodsReceipt(orgA.getId(), fgWarehouseA.id(), doorItem.id(), new BigDecimal("5.000"));

        DispatchOrderResponse dispatch2 = dispatchOrderService.createDispatchOrder(orgA.getId(), new CreateDispatchOrderRequest(
                null,
                order.id(),
                LocalDate.now(),
                "ABC Furniture, Industrial Area, Ongole",
                "Express Logistics",
                "AP-27-TY-1002",
                "LR-9989",
                "Final shipment",
                DispatchOrderStatus.POSTED,
                List.of(
                        new DispatchOrderItemRequest(chairSoItemId, chairItem.id(), new BigDecimal("8.000")),
                        new DispatchOrderItemRequest(doorSoItemId, doorItem.id(), new BigDecimal("5.000"))
                )
        ));

        Assertions.assertEquals(DispatchOrderStatus.POSTED, dispatch2.status());

        // Sales order must now be FULLY_DISPATCHED!
        SalesOrderResponse fullyDispatchedOrder = salesOrderService.getSalesOrderById(orgA.getId(), order.id());
        Assertions.assertEquals(SalesOrderStatus.FULLY_DISPATCHED, fullyDispatchedOrder.status());

        // Step 10: Verify dispatch history endpoint
        List<DispatchOrderResponse> history = dispatchOrderService.getDispatchOrdersBySalesOrder(orgA.getId(), order.id());
        Assertions.assertEquals(2, history.size());
    }

    @Test
    void testDraftDispatchHasNoStockImpactAndCanBeEdited() {
        addStockViaGoodsReceipt(orgA.getId(), fgWarehouseA.id(), tableItem.id(), new BigDecimal("10.000"));

        SalesOrderResponse order = salesOrderService.createSalesOrder(orgA.getId(), new CreateSalesOrderRequest(
                null, customerA.id(), fgWarehouseA.id(), LocalDate.now(), null, null, null, null, null,
                SalesOrderStatus.DRAFT,
                List.of(new SalesOrderItemRequest(null, tableItem.id(), new BigDecimal("10.000"), new BigDecimal("100.00")))
        ));
        salesOrderService.confirmSalesOrder(orgA.getId(), order.id());
        Long soItemId = order.items().get(0).id();

        // Create DRAFT dispatch
        DispatchOrderResponse draft = dispatchOrderService.createDispatchOrder(orgA.getId(), new CreateDispatchOrderRequest(
                null, order.id(), LocalDate.now(), null, null, null, null, "Draft note",
                DispatchOrderStatus.DRAFT,
                List.of(new DispatchOrderItemRequest(soItemId, tableItem.id(), new BigDecimal("4.000")))
        ));

        Assertions.assertEquals(DispatchOrderStatus.DRAFT, draft.status());

        // Stock in warehouse should be unchanged (10.000)
        BigDecimal stock = stockMovementRepository.getCurrentStockForItemAndWarehouse(orgA.getId(), tableItem.id(), fgWarehouseA.id());
        Assertions.assertEquals(0, new BigDecimal("10.000").compareTo(stock));

        // Sales order item dispatched quantity should be 0
        SalesOrderResponse so = salesOrderService.getSalesOrderById(orgA.getId(), order.id());
        Assertions.assertEquals(0, BigDecimal.ZERO.compareTo(so.items().get(0).dispatchedQuantity()));
        Assertions.assertEquals(SalesOrderStatus.CONFIRMED, so.status());

        // Edit draft to 6.000
        DispatchOrderResponse updated = dispatchOrderService.updateDispatchOrder(orgA.getId(), draft.id(), new UpdateDispatchOrderRequest(
                LocalDate.now(), null, "Transporter X", null, null, "Updated note",
                List.of(new DispatchOrderItemRequest(soItemId, tableItem.id(), new BigDecimal("6.000")))
        ));
        Assertions.assertEquals(0, new BigDecimal("6.000").compareTo(updated.items().get(0).dispatchQuantity()));

        // Now post it
        DispatchOrderResponse posted = dispatchOrderService.postDispatchOrder(orgA.getId(), draft.id());
        Assertions.assertEquals(DispatchOrderStatus.POSTED, posted.status());

        // Now stock should be 10 - 6 = 4
        BigDecimal remainingStock = stockMovementRepository.getCurrentStockForItemAndWarehouse(orgA.getId(), tableItem.id(), fgWarehouseA.id());
        Assertions.assertEquals(0, new BigDecimal("4.000").compareTo(remainingStock));

        // Posted dispatch cannot be deleted or edited
        Assertions.assertThrows(IllegalStateException.class, () -> dispatchOrderService.deleteDispatchOrder(orgA.getId(), draft.id()));
        Assertions.assertThrows(IllegalStateException.class, () -> dispatchOrderService.updateDispatchOrder(orgA.getId(), draft.id(),
                new UpdateDispatchOrderRequest(LocalDate.now(), null, null, null, null, null,
                        List.of(new DispatchOrderItemRequest(soItemId, tableItem.id(), BigDecimal.ONE)))));
    }

    @Test
    void testValidationPreventsExcessQuantityAndInsufficientStock() {
        addStockViaGoodsReceipt(orgA.getId(), fgWarehouseA.id(), tableItem.id(), new BigDecimal("5.000"));

        SalesOrderResponse order = salesOrderService.createSalesOrder(orgA.getId(), new CreateSalesOrderRequest(
                null, customerA.id(), fgWarehouseA.id(), LocalDate.now(), null, null, null, null, null,
                SalesOrderStatus.DRAFT,
                List.of(new SalesOrderItemRequest(null, tableItem.id(), new BigDecimal("10.000"), new BigDecimal("100.00")))
        ));
        salesOrderService.confirmSalesOrder(orgA.getId(), order.id());
        Long soItemId = order.items().get(0).id();

        // 1. Exceeds pending quantity (pending is 10, request 12)
        Assertions.assertThrows(IllegalArgumentException.class, () ->
                dispatchOrderService.createDispatchOrder(orgA.getId(), new CreateDispatchOrderRequest(
                        null, order.id(), LocalDate.now(), null, null, null, null, null,
                        DispatchOrderStatus.DRAFT,
                        List.of(new DispatchOrderItemRequest(soItemId, tableItem.id(), new BigDecimal("12.000")))
                ))
        );

        // 2. Exceeds warehouse stock on post (pending is 10, stock is 5, request 8)
        Assertions.assertThrows(IllegalArgumentException.class, () ->
                dispatchOrderService.createDispatchOrder(orgA.getId(), new CreateDispatchOrderRequest(
                        null, order.id(), LocalDate.now(), null, null, null, null, null,
                        DispatchOrderStatus.POSTED,
                        List.of(new DispatchOrderItemRequest(soItemId, tableItem.id(), new BigDecimal("8.000")))
                ))
        );
    }

    @Test
    void testTenantIsolation() {
        SalesOrderResponse order = salesOrderService.createSalesOrder(orgA.getId(), new CreateSalesOrderRequest(
                null, customerA.id(), fgWarehouseA.id(), LocalDate.now(), null, null, null, null, null,
                SalesOrderStatus.DRAFT,
                List.of(new SalesOrderItemRequest(null, tableItem.id(), new BigDecimal("5.000"), new BigDecimal("100.00")))
        ));
        salesOrderService.confirmSalesOrder(orgA.getId(), order.id());
        Long soItemId = order.items().get(0).id();

        // Org B cannot create dispatch against Org A's order
        Assertions.assertThrows(ResourceNotFoundException.class, () ->
                dispatchOrderService.createDispatchOrder(orgB.getId(), new CreateDispatchOrderRequest(
                        null, order.id(), LocalDate.now(), null, null, null, null, null,
                        DispatchOrderStatus.DRAFT,
                        List.of(new DispatchOrderItemRequest(soItemId, tableItem.id(), new BigDecimal("2.000")))
                ))
        );
    }
}
