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
import si.plaan.repository.*;
import si.plaan.service.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@SpringBootTest
@Transactional
class ProductionOrderCompletionClosureTests {

    @Autowired
    private ProductionOrderService productionOrderService;

    @Autowired
    private MaterialIssueService materialIssueService;

    @Autowired
    private MaterialConsumptionService materialConsumptionService;

    @Autowired
    private MaterialReturnService materialReturnService;

    @Autowired
    private ProductionReceiptService productionReceiptService;

    @Autowired
    private BomService bomService;

    @Autowired
    private OpeningStockService openingStockService;

    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private ItemTypeRepository itemTypeRepository;

    @Autowired
    private WarehouseRepository warehouseRepository;

    @Autowired
    private OrganizationRepository organizationRepository;

    @Autowired
    private StockMovementRepository stockMovementRepository;

    private Long orgId;
    private Long otherOrgId;
    private Warehouse sourceWarehouse;
    private Warehouse fgWarehouse;
    private Item productItem;
    private Item boardItem;
    private Item screwItem;

    @BeforeEach
    void setup() {
        Organization org = organizationRepository.save(Organization.builder()
                .name("Org-" + UUID.randomUUID())
                .slug("org-" + UUID.randomUUID())
                .baseCurrency("INR")
                .active(true)
                .build());
        orgId = org.getId();

        Organization otherOrg = organizationRepository.save(Organization.builder()
                .name("OtherOrg-" + UUID.randomUUID())
                .slug("other-org-" + UUID.randomUUID())
                .baseCurrency("INR")
                .active(true)
                .build());
        otherOrgId = otherOrg.getId();

        ItemType rawType = itemTypeRepository.save(ItemType.builder()
                .organization(org)
                .name("Raw Material")
                .description("Raw components")
                .build());

        ItemType fgType = itemTypeRepository.save(ItemType.builder()
                .organization(org)
                .name("Finished Goods")
                .description("Manufactured goods")
                .build());

        productItem = itemRepository.save(Item.builder()
                .organization(org)
                .name("Wooden Table")
                .itemCode("FG-TBL-" + UUID.randomUUID().toString().substring(0, 5))
                .itemType(fgType)
                .unitOfMeasure("Nos")
                .active(true)
                .build());

        boardItem = itemRepository.save(Item.builder()
                .organization(org)
                .name("Wooden Board")
                .itemCode("RAW-BRD-" + UUID.randomUUID().toString().substring(0, 5))
                .itemType(rawType)
                .unitOfMeasure("Nos")
                .active(true)
                .build());

        screwItem = itemRepository.save(Item.builder()
                .organization(org)
                .name("Screws")
                .itemCode("RAW-SCR-" + UUID.randomUUID().toString().substring(0, 5))
                .itemType(rawType)
                .unitOfMeasure("Nos")
                .active(true)
                .build());

        sourceWarehouse = warehouseRepository.save(Warehouse.builder()
                .organization(org)
                .name("Raw Material Store")
                .warehouseCode("RMS-" + UUID.randomUUID().toString().substring(0, 4))
                .active(true)
                .build());

        fgWarehouse = warehouseRepository.save(Warehouse.builder()
                .organization(org)
                .name("Finished Goods Store")
                .warehouseCode("FGS-" + UUID.randomUUID().toString().substring(0, 4))
                .active(true)
                .build());

        // Create Active BOM: 1 Table requires 1 Board + 16 Screws
        bomService.createBom(orgId, CreateBomRequest.builder()
                .productId(productItem.getId())
                .outputQuantity(BigDecimal.ONE)
                .saveAndActivate(true)
                .items(List.of(
                        BomItemRequest.builder().materialId(boardItem.getId()).quantity(BigDecimal.ONE).build(),
                        BomItemRequest.builder().materialId(screwItem.getId()).quantity(new BigDecimal("16")).build()
                ))
                .build());

        // Seed Warehouse Stock: 50 Boards, 500 Screws
        openingStockService.createOpeningStock(orgId, CreateOpeningStockRequest.builder()
                .warehouseId(sourceWarehouse.getId())
                .openingDate(LocalDate.now())
                .postImmediately(true)
                .items(List.of(
                        OpeningStockItemRequest.builder().itemId(boardItem.getId()).quantity(new BigDecimal("50")).build(),
                        OpeningStockItemRequest.builder().itemId(screwItem.getId()).quantity(new BigDecimal("500")).build()
                ))
                .build());
    }

    private ProductionOrderResponse createAndReleaseOrder(int tableQty) {
        return productionOrderService.createProductionOrder(orgId, CreateProductionOrderRequest.builder()
                .orderDate(LocalDate.now())
                .productId(productItem.getId())
                .productionQuantity(new BigDecimal(tableQty))
                .sourceWarehouseId(sourceWarehouse.getId())
                .finishedGoodsWarehouseId(fgWarehouse.getId())
                .releaseImmediately(true)
                .build());
    }

    @Test
    void testCompleteAndCloseProductionOrderLifecycle() {
        // 1. Create order for 10 tables -> Requires 10 Boards, 160 Screws
        ProductionOrderResponse order = createAndReleaseOrder(10);
        Assertions.assertEquals(ProductionOrderStatus.RELEASED, order.getStatus());

        // Checklist 2: Prevent premature completion from RELEASED status
        Assertions.assertThrows(IllegalStateException.class, () ->
                productionOrderService.completeProductionOrder(orgId, order.getId(), "test@plaan.si")
        );

        // Issue materials to move order to IN_PROGRESS (10 boards, 160 screws)
        materialIssueService.createMaterialIssue(orgId, CreateMaterialIssueRequest.builder()
                .productionOrderId(order.getId())
                .issueDate(LocalDate.now())
                .postImmediately(true)
                .items(List.of(
                        MaterialIssueItemRequest.builder().materialId(boardItem.getId()).issueQuantity(new BigDecimal("10")).build(),
                        MaterialIssueItemRequest.builder().materialId(screwItem.getId()).issueQuantity(new BigDecimal("160")).build()
                ))
                .build());

        // Consume raw materials (10 boards, 150 screws - 10 screws left over in production)
        materialConsumptionService.createMaterialConsumption(orgId, CreateMaterialConsumptionRequest.builder()
                .productionOrderId(order.getId())
                .consumptionDate(LocalDate.now())
                .postImmediately(true)
                .items(List.of(
                        MaterialConsumptionItemRequest.builder().materialId(boardItem.getId()).consumedQuantity(new BigDecimal("10")).build(),
                        MaterialConsumptionItemRequest.builder().materialId(screwItem.getId()).consumedQuantity(new BigDecimal("150")).build()
                ))
                .build());

        // Receive partial finished goods: 6 tables
        productionReceiptService.createProductionReceipt(orgId, CreateProductionReceiptRequest.builder()
                .productionOrderId(order.getId())
                .receiptDate(LocalDate.now())
                .receiptQuantity(new BigDecimal("6"))
                .postImmediately(true)
                .build());

        // Checklist 2: Prevent premature completion when pending quantity remains (4 tables pending)
        IllegalStateException prematureEx = Assertions.assertThrows(IllegalStateException.class, () ->
                productionOrderService.completeProductionOrder(orgId, order.getId(), "test@plaan.si")
        );
        Assertions.assertTrue(prematureEx.getMessage().contains("entire planned quantity must be received first"));

        // Receive 3 more tables (total 9 received, 1 pending)
        productionReceiptService.createProductionReceipt(orgId, CreateProductionReceiptRequest.builder()
                .productionOrderId(order.getId())
                .receiptDate(LocalDate.now())
                .receiptQuantity(new BigDecimal("3"))
                .postImmediately(true)
                .build());

        // Create a draft receipt for the remaining 1 table
        ProductionReceiptResponse draftPr = productionReceiptService.createProductionReceipt(orgId, CreateProductionReceiptRequest.builder()
                .productionOrderId(order.getId())
                .receiptDate(LocalDate.now())
                .receiptQuantity(BigDecimal.ONE)
                .postImmediately(false)
                .build());

        // Checklist 2: Cannot complete production while draft receipts/issues exist
        Assertions.assertThrows(IllegalStateException.class, () ->
                productionOrderService.completeProductionOrder(orgId, order.getId(), "test@plaan.si")
        );

        // Post the draft receipt -> Order is now fully received (10 tables) and has 0 draft receipts
        productionReceiptService.postProductionReceipt(orgId, draftPr.getId());

        long stockMovementsBeforeCompletion = stockMovementRepository.count();

        // Checklist 1 & 8: Complete fully received Production Order and record audit info
        ProductionOrderResponse completedOrder = productionOrderService.completeProductionOrder(orgId, order.getId(), "storekeeper@plaan.si");
        Assertions.assertEquals(ProductionOrderStatus.COMPLETED, completedOrder.getStatus());
        Assertions.assertEquals(LocalDate.now(), completedOrder.getCompletedDate());
        Assertions.assertEquals("storekeeper@plaan.si", completedOrder.getCompletedBy());

        // Checklist 10: Verify no additional stock movements were generated by completion
        Assertions.assertEquals(stockMovementsBeforeCompletion, stockMovementRepository.count());

        // Checklist 3: Block material issues and production receipts after completion
        Assertions.assertThrows(IllegalStateException.class, () ->
                materialIssueService.createMaterialIssue(orgId, CreateMaterialIssueRequest.builder()
                        .productionOrderId(order.getId())
                        .issueDate(LocalDate.now())
                        .items(List.of(MaterialIssueItemRequest.builder().materialId(boardItem.getId()).issueQuantity(BigDecimal.ONE).build()))
                        .build())
        );

        Assertions.assertThrows(IllegalStateException.class, () ->
                productionReceiptService.createProductionReceipt(orgId, CreateProductionReceiptRequest.builder()
                        .productionOrderId(order.getId())
                        .receiptDate(LocalDate.now())
                        .receiptQuantity(BigDecimal.ONE)
                        .build())
        );

        // Checklist 5: Prevent closure with unaccounted materials (10 screws remaining)
        ProductionOrderClosureValidationResponse validationBeforeReturn = productionOrderService.getClosureValidation(orgId, order.getId());
        Assertions.assertTrue(validationBeforeReturn.isProductionCompleted());
        Assertions.assertTrue(validationBeforeReturn.isAllPlannedQuantitiesReceived());
        Assertions.assertFalse(validationBeforeReturn.isAllMaterialsReconciled());
        Assertions.assertFalse(validationBeforeReturn.isCanClose());
        Assertions.assertEquals(1, validationBeforeReturn.getUnreconciledMaterialsCount());

        IllegalStateException unreconciledCloseEx = Assertions.assertThrows(IllegalStateException.class, () ->
                productionOrderService.closeProductionOrder(orgId, order.getId(), new CloseProductionOrderRequest("closing notes"), "manager@plaan.si")
        );
        Assertions.assertTrue(unreconciledCloseEx.getMessage().contains("all issued materials must be reconciled"));

        // Checklist 4: Allow material reconciliation after completion (Return the 10 unused screws)
        MaterialReturnResponse returnTx = materialReturnService.createMaterialReturn(orgId, CreateMaterialReturnRequest.builder()
                .productionOrderId(order.getId())
                .returnDate(LocalDate.now())
                .postImmediately(true)
                .items(List.of(MaterialReturnItemRequest.builder().materialId(screwItem.getId()).returnQuantity(new BigDecimal("10")).build()))
                .build());
        Assertions.assertEquals(MaterialReturnStatus.POSTED, returnTx.getStatus());

        // Checklist 6: Prevent closure if a pending draft transaction exists
        MaterialConsumptionResponse draftConsumption = materialConsumptionService.createMaterialConsumption(orgId, CreateMaterialConsumptionRequest.builder()
                .productionOrderId(order.getId())
                .consumptionDate(LocalDate.now())
                .postImmediately(false)
                .items(List.of(MaterialConsumptionItemRequest.builder().materialId(boardItem.getId()).consumedQuantity(BigDecimal.ZERO).build()))
                .build());

        ProductionOrderClosureValidationResponse validationWithDraft = productionOrderService.getClosureValidation(orgId, order.getId());
        Assertions.assertFalse(validationWithDraft.isNoPendingDraftTransactions());
        Assertions.assertFalse(validationWithDraft.isCanClose());

        Assertions.assertThrows(IllegalStateException.class, () ->
                productionOrderService.closeProductionOrder(orgId, order.getId(), new CloseProductionOrderRequest("closing notes"), "manager@plaan.si")
        );

        // Delete draft consumption
        materialConsumptionService.deleteDraftMaterialConsumption(orgId, draftConsumption.getId());

        // Validate closure is now fully possible!
        ProductionOrderClosureValidationResponse validationReady = productionOrderService.getClosureValidation(orgId, order.getId());
        Assertions.assertTrue(validationReady.isProductionCompleted());
        Assertions.assertTrue(validationReady.isAllPlannedQuantitiesReceived());
        Assertions.assertTrue(validationReady.isAllMaterialsReconciled());
        Assertions.assertTrue(validationReady.isNoPendingDraftTransactions());
        Assertions.assertTrue(validationReady.isCanClose());

        long stockMovementsBeforeClosure = stockMovementRepository.count();

        // Checklist 7 & 8: Successfully close reconciled order and record closure audit info
        ProductionOrderResponse closedOrder = productionOrderService.closeProductionOrder(
                orgId, order.getId(), new CloseProductionOrderRequest("All materials accounted for and reconciled."), "manager@plaan.si"
        );
        Assertions.assertEquals(ProductionOrderStatus.CLOSED, closedOrder.getStatus());
        Assertions.assertEquals(LocalDate.now(), closedOrder.getClosedDate());
        Assertions.assertEquals("manager@plaan.si", closedOrder.getClosedBy());
        Assertions.assertEquals("All materials accounted for and reconciled.", closedOrder.getClosureNotes());

        // Checklist 10: Verify no additional stock movements generated by closure
        Assertions.assertEquals(stockMovementsBeforeClosure, stockMovementRepository.count());

        // Checklist 9: Make closed order read-only: cannot cancel, edit, delete or add any transaction
        Assertions.assertThrows(IllegalStateException.class, () ->
                productionOrderService.cancelProductionOrder(orgId, order.getId())
        );
        Assertions.assertThrows(IllegalStateException.class, () ->
                productionOrderService.deleteDraftProductionOrder(orgId, order.getId())
        );
        Assertions.assertThrows(IllegalStateException.class, () ->
                materialConsumptionService.createMaterialConsumption(orgId, CreateMaterialConsumptionRequest.builder()
                        .productionOrderId(order.getId())
                        .consumptionDate(LocalDate.now())
                        .items(List.of(MaterialConsumptionItemRequest.builder().materialId(screwItem.getId()).consumedQuantity(BigDecimal.ONE).build()))
                        .build())
        );
        Assertions.assertThrows(IllegalStateException.class, () ->
                materialReturnService.createMaterialReturn(orgId, CreateMaterialReturnRequest.builder()
                        .productionOrderId(order.getId())
                        .returnDate(LocalDate.now())
                        .items(List.of(MaterialReturnItemRequest.builder().materialId(screwItem.getId()).returnQuantity(BigDecimal.ONE).build()))
                        .build())
        );

        // Checklist 11: Verify tenant isolation
        Assertions.assertThrows(ResourceNotFoundException.class, () ->
                productionOrderService.completeProductionOrder(otherOrgId, order.getId(), "intruder@other.si")
        );
        Assertions.assertThrows(ResourceNotFoundException.class, () ->
                productionOrderService.closeProductionOrder(otherOrgId, order.getId(), new CloseProductionOrderRequest("hacked"), "intruder@other.si")
        );
    }
}
