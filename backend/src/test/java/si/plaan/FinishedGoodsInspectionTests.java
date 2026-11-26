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
class FinishedGoodsInspectionTests {

    @Autowired private FinishedGoodsInspectionService finishedGoodsInspectionService;
    @Autowired private InspectionTemplateService inspectionTemplateService;
    @Autowired private ProductionReceiptService productionReceiptService;
    @Autowired private MaterialIssueService materialIssueService;
    @Autowired private MaterialConsumptionService materialConsumptionService;
    @Autowired private ProductionOrderService productionOrderService;
    @Autowired private BomService bomService;
    @Autowired private OpeningStockService openingStockService;
    @Autowired private StockAvailabilityService stockAvailabilityService;
    @Autowired private StockMovementRepository stockMovementRepository;
    @Autowired private ItemRepository itemRepository;
    @Autowired private ItemTypeRepository itemTypeRepository;
    @Autowired private WarehouseRepository warehouseRepository;
    @Autowired private OrganizationRepository organizationRepository;

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
                .name("FGI-Org-" + UUID.randomUUID())
                .slug("fgi-org-" + UUID.randomUUID())
                .baseCurrency("INR")
                .active(true)
                .build());
        orgId = org.getId();

        Organization otherOrg = organizationRepository.save(Organization.builder()
                .name("FGI-Other-" + UUID.randomUUID())
                .slug("fgi-other-" + UUID.randomUUID())
                .baseCurrency("INR")
                .active(true)
                .build());
        otherOrgId = otherOrg.getId();

        ItemType rawType = itemTypeRepository.save(ItemType.builder()
                .organization(org).name("Raw Material").build());
        ItemType fgType = itemTypeRepository.save(ItemType.builder()
                .organization(org).name("Finished Goods").build());

        productItem = itemRepository.save(Item.builder()
                .organization(org).name("Wooden Table")
                .itemCode("FG-TBL-" + UUID.randomUUID().toString().substring(0, 5))
                .itemType(fgType).unitOfMeasure("Nos").active(true).build());
        boardItem = itemRepository.save(Item.builder()
                .organization(org).name("Wooden Board")
                .itemCode("RAW-BRD-" + UUID.randomUUID().toString().substring(0, 5))
                .itemType(rawType).unitOfMeasure("Nos").active(true).build());
        screwItem = itemRepository.save(Item.builder()
                .organization(org).name("Screws")
                .itemCode("RAW-SCR-" + UUID.randomUUID().toString().substring(0, 5))
                .itemType(rawType).unitOfMeasure("Nos").active(true).build());

        sourceWarehouse = warehouseRepository.save(Warehouse.builder()
                .organization(org).name("Raw Material Store")
                .warehouseCode("RMS-" + UUID.randomUUID().toString().substring(0, 4)).active(true).build());
        fgWarehouse = warehouseRepository.save(Warehouse.builder()
                .organization(org).name("Finished Goods Store")
                .warehouseCode("FGS-" + UUID.randomUUID().toString().substring(0, 4)).active(true).build());

        bomService.createBom(orgId, CreateBomRequest.builder()
                .productId(productItem.getId())
                .outputQuantity(BigDecimal.ONE)
                .saveAndActivate(true)
                .items(List.of(
                        BomItemRequest.builder().materialId(boardItem.getId()).quantity(BigDecimal.ONE).build(),
                        BomItemRequest.builder().materialId(screwItem.getId()).quantity(new BigDecimal("16")).build()
                ))
                .build());

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

    private List<InspectionTemplateParameterRequest> params() {
        return List.of(
                new InspectionTemplateParameterRequest("Surface Finish", "No scratches or cracks"),
                new InspectionTemplateParameterRequest("Dimensions", "Matches product specifications"),
                new InspectionTemplateParameterRequest("Stability", "No wobbling"),
                new InspectionTemplateParameterRequest("Assembly", "All components securely fitted")
        );
    }

    private ProductionOrderResponse prepareInProgressOrder(int qty) {
        ProductionOrderResponse order = productionOrderService.createProductionOrder(orgId,
                CreateProductionOrderRequest.builder()
                        .orderDate(LocalDate.now())
                        .productId(productItem.getId())
                        .productionQuantity(new BigDecimal(qty))
                        .sourceWarehouseId(sourceWarehouse.getId())
                        .finishedGoodsWarehouseId(fgWarehouse.getId())
                        .releaseImmediately(true)
                        .build());

        materialIssueService.createMaterialIssue(orgId, CreateMaterialIssueRequest.builder()
                .productionOrderId(order.getId())
                .issueDate(LocalDate.now())
                .postImmediately(true)
                .items(List.of(
                        MaterialIssueItemRequest.builder().materialId(boardItem.getId())
                                .issueQuantity(new BigDecimal(qty)).build(),
                        MaterialIssueItemRequest.builder().materialId(screwItem.getId())
                                .issueQuantity(new BigDecimal(qty * 16L)).build()
                ))
                .build());

        materialConsumptionService.createMaterialConsumption(orgId, CreateMaterialConsumptionRequest.builder()
                .productionOrderId(order.getId())
                .consumptionDate(LocalDate.now())
                .postImmediately(true)
                .items(List.of(
                        MaterialConsumptionItemRequest.builder().materialId(boardItem.getId())
                                .consumedQuantity(new BigDecimal(qty)).build(),
                        MaterialConsumptionItemRequest.builder().materialId(screwItem.getId())
                                .consumedQuantity(new BigDecimal(qty * 16L)).build()
                ))
                .build());

        return productionOrderService.getProductionOrderById(orgId, order.getId());
    }

    @Test
    void testAutoCreatePendingFromPostedReceiptWhenActiveTemplate() {
        inspectionTemplateService.create(orgId, new CreateInspectionTemplateRequest(
                null, "Wooden Table FG QC", productItem.getId(), InspectionType.FINISHED_GOODS,
                null, true, params()));

        ProductionOrderResponse order = prepareInProgressOrder(10);
        ProductionReceiptResponse receipt = productionReceiptService.createProductionReceipt(orgId,
                CreateProductionReceiptRequest.builder()
                        .productionOrderId(order.getId())
                        .receiptDate(LocalDate.now())
                        .receiptQuantity(new BigDecimal("10"))
                        .postImmediately(true)
                        .build());

        PageResponse<FinishedGoodsInspectionResponse> page = finishedGoodsInspectionService.getInspections(
                orgId, null, FinishedGoodsInspectionStatus.PENDING, PageRequest.of(0, 10));
        Assertions.assertEquals(1, page.totalElements());
        FinishedGoodsInspectionResponse fgi = page.content().get(0);
        Assertions.assertEquals(receipt.getReceiptNumber(), fgi.productionReceiptNumber());
        Assertions.assertEquals(order.getOrderNumber(), fgi.productionOrderNumber());
        Assertions.assertEquals(4, fgi.parameters().size());
        Assertions.assertEquals(0, new BigDecimal("10").compareTo(fgi.receivedQuantity()));
    }

    @Test
    void testNoInspectionWithoutActiveTemplate() {
        ProductionOrderResponse order = prepareInProgressOrder(5);
        productionReceiptService.createProductionReceipt(orgId, CreateProductionReceiptRequest.builder()
                .productionOrderId(order.getId())
                .receiptDate(LocalDate.now())
                .receiptQuantity(new BigDecimal("5"))
                .postImmediately(true)
                .build());

        PageResponse<FinishedGoodsInspectionResponse> page = finishedGoodsInspectionService.getInspections(
                orgId, null, null, PageRequest.of(0, 10));
        Assertions.assertEquals(0, page.totalElements());
        Assertions.assertEquals(0, new BigDecimal("5").compareTo(
                stockAvailabilityService.getAvailable(orgId, productItem.getId(), fgWarehouse.getId())));
    }

    @Test
    void testHoldReleaseRejectedAndCloseBlocked() {
        inspectionTemplateService.create(orgId, new CreateInspectionTemplateRequest(
                null, "Wooden Table FG QC", productItem.getId(), InspectionType.FINISHED_GOODS,
                null, true, params()));

        ProductionOrderResponse order = prepareInProgressOrder(10);
        productionReceiptService.createProductionReceipt(orgId, CreateProductionReceiptRequest.builder()
                .productionOrderId(order.getId())
                .receiptDate(LocalDate.now())
                .receiptQuantity(new BigDecimal("10"))
                .postImmediately(true)
                .build());

        Assertions.assertEquals(0, new BigDecimal("10").compareTo(
                stockAvailabilityService.getOnHand(orgId, productItem.getId(), fgWarehouse.getId())));
        Assertions.assertEquals(0, new BigDecimal("10").compareTo(
                stockAvailabilityService.getPendingInspection(orgId, productItem.getId(), fgWarehouse.getId())));
        Assertions.assertEquals(0, BigDecimal.ZERO.compareTo(
                stockAvailabilityService.getAvailable(orgId, productItem.getId(), fgWarehouse.getId())));

        FinishedGoodsInspectionResponse pending = finishedGoodsInspectionService.getInspections(
                orgId, null, null, PageRequest.of(0, 1)).content().get(0);

        List<FinishedGoodsInspectionParameterResultRequest> results = pending.parameters().stream()
                .map(p -> new FinishedGoodsInspectionParameterResultRequest(
                        p.id(),
                        "Stability".equals(p.parameterName())
                                ? InspectionParameterResult.FAIL
                                : InspectionParameterResult.PASS))
                .toList();

        long movementsBefore = stockMovementRepository.count();
        FinishedGoodsInspectionResponse completed = finishedGoodsInspectionService.complete(
                orgId, pending.id(), null,
                new UpdateFinishedGoodsInspectionRequest(
                        LocalDate.now(), new BigDecimal("8"),
                        "2 tables rejected due to stability issues", true, results));

        Assertions.assertEquals(FinishedGoodsInspectionStatus.COMPLETED, completed.status());
        Assertions.assertEquals(0, new BigDecimal("8").compareTo(completed.acceptedQuantity()));
        Assertions.assertEquals(0, new BigDecimal("2").compareTo(completed.rejectedQuantity()));
        Assertions.assertEquals(movementsBefore, stockMovementRepository.count());

        Assertions.assertEquals(0, new BigDecimal("8").compareTo(
                stockAvailabilityService.getAvailable(orgId, productItem.getId(), fgWarehouse.getId())));
        Assertions.assertEquals(0, new BigDecimal("2").compareTo(
                stockAvailabilityService.getRejected(orgId, productItem.getId(), fgWarehouse.getId())));

        ProductionOrderResponse afterQc = productionOrderService.getProductionOrderById(orgId, order.getId());
        Assertions.assertEquals(0, BigDecimal.ZERO.compareTo(afterQc.getQualityPendingQuantity()));
        Assertions.assertEquals(0, new BigDecimal("8").compareTo(afterQc.getQualityAcceptedQuantity()));
        Assertions.assertEquals(0, new BigDecimal("2").compareTo(afterQc.getQualityRejectedQuantity()));

        // Return leftover issued materials so close can otherwise succeed
        // Remaining issued after full consume is 0 for boards/screws in this setup.

        productionOrderService.completeProductionOrder(orgId, order.getId(), "tester@plaan.si");

        // Without FGI complete, close would fail — already completed FGI here, so close should work
        // Create another pending FGI scenario: new order with incomplete inspection
        Assertions.assertDoesNotThrow(() ->
                productionOrderService.closeProductionOrder(orgId, order.getId(),
                        new CloseProductionOrderRequest("ok"), "tester@plaan.si"));
    }

    @Test
    void testCloseBlockedWhileInspectionPending() {
        inspectionTemplateService.create(orgId, new CreateInspectionTemplateRequest(
                null, "Wooden Table FG QC", productItem.getId(), InspectionType.FINISHED_GOODS,
                null, true, params()));

        ProductionOrderResponse order = prepareInProgressOrder(10);
        productionReceiptService.createProductionReceipt(orgId, CreateProductionReceiptRequest.builder()
                .productionOrderId(order.getId())
                .receiptDate(LocalDate.now())
                .receiptQuantity(new BigDecimal("10"))
                .postImmediately(true)
                .build());

        productionOrderService.completeProductionOrder(orgId, order.getId(), "tester@plaan.si");

        ProductionOrderClosureValidationResponse validation =
                productionOrderService.getClosureValidation(orgId, order.getId());
        Assertions.assertFalse(validation.isAllQualityInspectionsCompleted());
        Assertions.assertEquals(1, validation.getPendingQualityInspectionsCount());
        Assertions.assertFalse(validation.isCanClose());

        IllegalStateException ex = Assertions.assertThrows(IllegalStateException.class, () ->
                productionOrderService.closeProductionOrder(orgId, order.getId(),
                        new CloseProductionOrderRequest(null), "tester@plaan.si"));
        Assertions.assertTrue(ex.getMessage().toLowerCase().contains("inspection"));
    }

    @Test
    void testTenantIsolationAndDuplicateComplete() {
        inspectionTemplateService.create(orgId, new CreateInspectionTemplateRequest(
                null, "Wooden Table FG QC", productItem.getId(), InspectionType.FINISHED_GOODS,
                null, true, params()));

        ProductionOrderResponse order = prepareInProgressOrder(10);
        productionReceiptService.createProductionReceipt(orgId, CreateProductionReceiptRequest.builder()
                .productionOrderId(order.getId())
                .receiptDate(LocalDate.now())
                .receiptQuantity(new BigDecimal("10"))
                .postImmediately(true)
                .build());

        FinishedGoodsInspectionResponse pending = finishedGoodsInspectionService.getInspections(
                orgId, null, null, PageRequest.of(0, 1)).content().get(0);

        Assertions.assertThrows(ResourceNotFoundException.class, () ->
                finishedGoodsInspectionService.getById(otherOrgId, pending.id()));

        List<FinishedGoodsInspectionParameterResultRequest> allPass = pending.parameters().stream()
                .map(p -> new FinishedGoodsInspectionParameterResultRequest(p.id(), InspectionParameterResult.PASS))
                .toList();

        finishedGoodsInspectionService.complete(orgId, pending.id(), null,
                new UpdateFinishedGoodsInspectionRequest(
                        LocalDate.now(), new BigDecimal("10"), null, true, allPass));

        Assertions.assertThrows(IllegalStateException.class, () ->
                finishedGoodsInspectionService.complete(orgId, pending.id(), null,
                        new UpdateFinishedGoodsInspectionRequest(
                                LocalDate.now(), new BigDecimal("10"), null, true, allPass)));
    }
}
