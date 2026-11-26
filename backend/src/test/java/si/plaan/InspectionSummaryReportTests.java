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
import si.plaan.repository.*;
import si.plaan.service.*;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@SpringBootTest
@Transactional
public class InspectionSummaryReportTests {

    @Autowired private InspectionSummaryReportService reportService;
    @Autowired private IncomingInspectionService incomingInspectionService;
    @Autowired private FinishedGoodsInspectionService finishedGoodsInspectionService;
    @Autowired private InspectionTemplateService inspectionTemplateService;
    @Autowired private GoodsReceiptService goodsReceiptService;
    @Autowired private PurchaseOrderService purchaseOrderService;
    @Autowired private ProductionReceiptService productionReceiptService;
    @Autowired private MaterialIssueService materialIssueService;
    @Autowired private MaterialConsumptionService materialConsumptionService;
    @Autowired private ProductionOrderService productionOrderService;
    @Autowired private BomService bomService;
    @Autowired private OpeningStockService openingStockService;
    @Autowired private ItemService itemService;
    @Autowired private SupplierService supplierService;
    @Autowired private WarehouseService warehouseService;
    @Autowired private OrganizationRepository organizationRepository;
    @Autowired private ItemRepository itemRepository;
    @Autowired private ItemTypeRepository itemTypeRepository;
    @Autowired private WarehouseRepository warehouseRepository;

    private Organization org1;
    private Organization org2;
    private SupplierResponse supplier;
    private WarehouseResponse warehouse;
    private ItemResponse board;
    private ItemResponse screws;
    private Warehouse sourceWarehouse;
    private Warehouse fgWarehouse;
    private Item productItem;
    private Item rawBoard;
    private Item rawScrew;

    @BeforeEach
    void setup() {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        org1 = organizationRepository.save(Organization.builder()
                .name("ISR Org " + uid).slug("isr-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());
        org2 = organizationRepository.save(Organization.builder()
                .name("ISR Other " + uid).slug("isr-o-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());

        supplier = supplierService.createSupplier(org1.getId(), new CreateSupplierRequest(
                "SUP-ISR", "ABC Timber", null, null, null, null, null, true));
        warehouse = warehouseService.createWarehouse(org1.getId(), new CreateWarehouseRequest(
                "WH-RM", "Raw Material Store", "Bangalore", null, true));
        board = itemService.createItem(org1.getId(), new CreateItemRequest(
                "ITM-BOARD", "Wooden Board", null, "Raw Materials", null, null, "Nos", null, true));
        screws = itemService.createItem(org1.getId(), new CreateItemRequest(
                "ITM-SCRW", "Screws", null, "Consumables", null, null, "Nos", null, true));

        ItemType rawType = itemTypeRepository.save(ItemType.builder()
                .organization(org1).name("Raw Material").build());
        ItemType fgType = itemTypeRepository.save(ItemType.builder()
                .organization(org1).name("Finished Goods").build());
        productItem = itemRepository.save(Item.builder()
                .organization(org1).name("Wooden Table")
                .itemCode("FG-TBL-" + uid).itemType(fgType).unitOfMeasure("Nos").active(true).build());
        rawBoard = itemRepository.save(Item.builder()
                .organization(org1).name("Board Component")
                .itemCode("RAW-B-" + uid).itemType(rawType).unitOfMeasure("Nos").active(true).build());
        rawScrew = itemRepository.save(Item.builder()
                .organization(org1).name("Screw Component")
                .itemCode("RAW-S-" + uid).itemType(rawType).unitOfMeasure("Nos").active(true).build());
        sourceWarehouse = warehouseRepository.save(Warehouse.builder()
                .organization(org1).name("Source WH").warehouseCode("SRC-" + uid).active(true).build());
        fgWarehouse = warehouseRepository.save(Warehouse.builder()
                .organization(org1).name("FG WH").warehouseCode("FG-" + uid).active(true).build());

        bomService.createBom(org1.getId(), CreateBomRequest.builder()
                .productId(productItem.getId())
                .outputQuantity(BigDecimal.ONE)
                .saveAndActivate(true)
                .items(List.of(
                        BomItemRequest.builder().materialId(rawBoard.getId()).quantity(BigDecimal.ONE).build(),
                        BomItemRequest.builder().materialId(rawScrew.getId()).quantity(new BigDecimal("16")).build()
                ))
                .build());
        openingStockService.createOpeningStock(org1.getId(), CreateOpeningStockRequest.builder()
                .warehouseId(sourceWarehouse.getId())
                .openingDate(LocalDate.of(2026, 10, 1))
                .postImmediately(true)
                .items(List.of(
                        OpeningStockItemRequest.builder().itemId(rawBoard.getId()).quantity(new BigDecimal("100")).build(),
                        OpeningStockItemRequest.builder().itemId(rawScrew.getId()).quantity(new BigDecimal("2000")).build()
                ))
                .build());
    }

    private List<InspectionTemplateParameterRequest> params() {
        return List.of(
                new InspectionTemplateParameterRequest("Surface Finish", "No defects"),
                new InspectionTemplateParameterRequest("Dimensions", "Within tolerance"),
                new InspectionTemplateParameterRequest("Condition", "No damage")
        );
    }

    private GoodsReceiptResponse postGrn(Long itemId, BigDecimal qty) {
        PurchaseOrderResponse po = purchaseOrderService.createPurchaseOrder(org1.getId(),
                new CreatePurchaseOrderRequest(
                        null, supplier.id(), warehouse.id(), LocalDate.of(2026, 11, 2), null, null,
                        PurchaseOrderStatus.ISSUED,
                        List.of(new PurchaseOrderItemRequest(itemId, qty, BigDecimal.TEN))));
        GoodsReceiptResponse draft = goodsReceiptService.createGoodsReceipt(org1.getId(),
                new CreateGoodsReceiptRequest(
                        null, po.id(), LocalDate.of(2026, 11, 3), null, null, GoodsReceiptStatus.DRAFT,
                        List.of(new GoodsReceiptItemRequest(po.items().get(0).id(), itemId, qty))));
        return goodsReceiptService.postGoodsReceipt(org1.getId(), draft.id());
    }

    private IncomingInspectionResponse completeIqc(IncomingInspectionResponse pending, BigDecimal accepted, LocalDate date) {
        List<IncomingInspectionParameterResultRequest> results = pending.parameters().stream()
                .map(p -> new IncomingInspectionParameterResultRequest(p.id(), InspectionParameterResult.PASS))
                .toList();
        String remarks = accepted.compareTo(pending.receivedQuantity()) < 0 ? "Partial rejection" : null;
        return incomingInspectionService.complete(org1.getId(), pending.id(), null,
                new UpdateIncomingInspectionRequest(date, accepted, remarks, true, results));
    }

    @Test
    public void testCombinedSummaryPerformanceFiltersAndIsolation() {
        inspectionTemplateService.create(org1.getId(), new CreateInspectionTemplateRequest(
                null, "Board Incoming QC", board.id(), InspectionType.INCOMING, null, true, params()));
        inspectionTemplateService.create(org1.getId(), new CreateInspectionTemplateRequest(
                null, "Screws Incoming QC", screws.id(), InspectionType.INCOMING, null, true, params()));
        inspectionTemplateService.create(org1.getId(), new CreateInspectionTemplateRequest(
                null, "Table FG QC", productItem.getId(), InspectionType.FINISHED_GOODS, null, true, params()));

        postGrn(board.id(), new BigDecimal("100"));
        postGrn(screws.id(), new BigDecimal("500"));

        IncomingInspectionResponse boardPending = incomingInspectionService.getInspections(
                org1.getId(), "Wooden Board", IncomingInspectionStatus.PENDING, PageRequest.of(0, 1))
                .content().get(0);
        IncomingInspectionResponse screwsPending = incomingInspectionService.getInspections(
                org1.getId(), "Screws", IncomingInspectionStatus.PENDING, PageRequest.of(0, 1))
                .content().get(0);

        IncomingInspectionResponse boardCompleted = completeIqc(
                boardPending, new BigDecimal("90"), LocalDate.of(2026, 11, 10));
        Assertions.assertEquals(IncomingInspectionStatus.COMPLETED, boardCompleted.status());

        // FGI path
        ProductionOrderResponse order = productionOrderService.createProductionOrder(org1.getId(),
                CreateProductionOrderRequest.builder()
                        .orderDate(LocalDate.of(2026, 11, 5))
                        .productId(productItem.getId())
                        .productionQuantity(new BigDecimal("10"))
                        .sourceWarehouseId(sourceWarehouse.getId())
                        .finishedGoodsWarehouseId(fgWarehouse.getId())
                        .releaseImmediately(true)
                        .build());
        materialIssueService.createMaterialIssue(org1.getId(), CreateMaterialIssueRequest.builder()
                .productionOrderId(order.getId())
                .issueDate(LocalDate.of(2026, 11, 6))
                .postImmediately(true)
                .items(List.of(
                        MaterialIssueItemRequest.builder().materialId(rawBoard.getId()).issueQuantity(new BigDecimal("10")).build(),
                        MaterialIssueItemRequest.builder().materialId(rawScrew.getId()).issueQuantity(new BigDecimal("160")).build()
                ))
                .build());
        materialConsumptionService.createMaterialConsumption(org1.getId(), CreateMaterialConsumptionRequest.builder()
                .productionOrderId(order.getId())
                .consumptionDate(LocalDate.of(2026, 11, 6))
                .postImmediately(true)
                .items(List.of(
                        MaterialConsumptionItemRequest.builder().materialId(rawBoard.getId()).consumedQuantity(new BigDecimal("10")).build(),
                        MaterialConsumptionItemRequest.builder().materialId(rawScrew.getId()).consumedQuantity(new BigDecimal("160")).build()
                ))
                .build());
        productionReceiptService.createProductionReceipt(org1.getId(), CreateProductionReceiptRequest.builder()
                .productionOrderId(order.getId())
                .receiptDate(LocalDate.of(2026, 11, 8))
                .receiptQuantity(new BigDecimal("10"))
                .postImmediately(true)
                .build());

        FinishedGoodsInspectionResponse fgiPending = finishedGoodsInspectionService.getInspections(
                org1.getId(), null, FinishedGoodsInspectionStatus.PENDING, PageRequest.of(0, 1))
                .content().get(0);
        List<FinishedGoodsInspectionParameterResultRequest> fgiResults = fgiPending.parameters().stream()
                .map(p -> new FinishedGoodsInspectionParameterResultRequest(p.id(), InspectionParameterResult.PASS))
                .toList();
        FinishedGoodsInspectionResponse fgiCompleted = finishedGoodsInspectionService.complete(
                org1.getId(), fgiPending.id(), null,
                new UpdateFinishedGoodsInspectionRequest(
                        LocalDate.of(2026, 11, 12), new BigDecimal("8"), "2 rejected", true, fgiResults));
        Assertions.assertEquals(FinishedGoodsInspectionStatus.COMPLETED, fgiCompleted.status());

        LocalDate from = LocalDate.of(2026, 11, 1);
        LocalDate to = LocalDate.of(2026, 11, 30);

        InspectionSummaryReportResponse report = reportService.getReport(
                org1.getId(), from, to, null, null, null, null, PageRequest.of(0, 50));

        // board completed, screws pending, fgi completed = 3
        Assertions.assertEquals(3, report.summary().totalInspections());
        Assertions.assertEquals(2, report.summary().completed());
        Assertions.assertEquals(1, report.summary().awaitingCompletion());
        Assertions.assertEquals(2, report.summary().inspectionsWithRejections());

        InspectionSummaryRowResponse boardRow = report.inspections().content().stream()
                .filter(r -> r.id().equals(boardCompleted.id()))
                .findFirst()
                .orElseThrow();
        Assertions.assertEquals(InspectionType.INCOMING, boardRow.inspectionType());
        Assertions.assertEquals(0, new BigDecimal("90").compareTo(boardRow.acceptedQuantity()));
        Assertions.assertEquals(0, new BigDecimal("10").compareTo(boardRow.rejectedQuantity()));
        Assertions.assertEquals(0, new BigDecimal("90.0").compareTo(boardRow.acceptanceRate()));
        Assertions.assertEquals(0, new BigDecimal("10.0").compareTo(boardRow.rejectionRate()));

        InspectionSummaryRowResponse screwsRow = report.inspections().content().stream()
                .filter(r -> r.id().equals(screwsPending.id()))
                .findFirst()
                .orElseThrow();
        Assertions.assertEquals("PENDING", screwsRow.status());
        Assertions.assertNull(screwsRow.acceptedQuantity());
        Assertions.assertNull(screwsRow.rejectedQuantity());
        Assertions.assertNull(screwsRow.acceptanceRate());

        InspectionSummaryRowResponse fgiRow = report.inspections().content().stream()
                .filter(r -> r.id().equals(fgiCompleted.id()))
                .findFirst()
                .orElseThrow();
        Assertions.assertEquals(InspectionType.FINISHED_GOODS, fgiRow.inspectionType());
        Assertions.assertEquals(0, new BigDecimal("8").compareTo(fgiRow.acceptedQuantity()));
        Assertions.assertEquals(0, new BigDecimal("2").compareTo(fgiRow.rejectedQuantity()));
        Assertions.assertEquals(0, new BigDecimal("80.0").compareTo(fgiRow.acceptanceRate()));

        Assertions.assertEquals(2, report.byItem().size());
        InspectionSummaryItemPerformanceResponse boardPerf = report.byItem().stream()
                .filter(p -> p.itemId().equals(board.id()) && p.inspectionType() == InspectionType.INCOMING)
                .findFirst()
                .orElseThrow();
        Assertions.assertEquals(0, new BigDecimal("90.0").compareTo(boardPerf.acceptanceRate()));

        InspectionSummaryReportResponse incomingOnly = reportService.getReport(
                org1.getId(), from, to, InspectionType.INCOMING, null, null, null, PageRequest.of(0, 20));
        Assertions.assertEquals(2, incomingOnly.summary().totalInspections());
        Assertions.assertTrue(incomingOnly.inspections().content().stream()
                .allMatch(r -> r.inspectionType() == InspectionType.INCOMING));

        InspectionSummaryReportResponse completedOnly = reportService.getReport(
                org1.getId(), from, to, null, null, null, "COMPLETED", PageRequest.of(0, 20));
        Assertions.assertEquals(2, completedOnly.summary().totalInspections());
        Assertions.assertEquals(2, completedOnly.summary().completed());
        Assertions.assertEquals(0, completedOnly.summary().awaitingCompletion());

        InspectionSummaryReportResponse boardItemOnly = reportService.getReport(
                org1.getId(), from, to, null, board.id(), null, null, PageRequest.of(0, 20));
        Assertions.assertEquals(1, boardItemOnly.summary().totalInspections());

        InspectionSummaryReportResponse warehouseOnly = reportService.getReport(
                org1.getId(), from, to, null, null, warehouse.id(), null, PageRequest.of(0, 20));
        Assertions.assertEquals(2, warehouseOnly.summary().totalInspections());

        // Cleared date range still finds records
        InspectionSummaryReportResponse noDates = reportService.getReport(
                org1.getId(), null, null, null, null, null, null, PageRequest.of(0, 50));
        Assertions.assertEquals(3, noDates.summary().totalInspections());

        byte[] csv = reportService.exportCsv(org1.getId(), from, to, null, null, null, null);
        String text = new String(csv, StandardCharsets.UTF_8);
        Assertions.assertTrue(text.contains(boardCompleted.inspectionNumber()));
        Assertions.assertTrue(text.contains("Wooden Board"));
        Assertions.assertTrue(text.contains("Finished Goods"));
        Assertions.assertTrue(text.contains(fgiCompleted.inspectionNumber()));

        InspectionSummaryReportResponse other = reportService.getReport(
                org2.getId(), from, to, null, null, null, null, PageRequest.of(0, 10));
        Assertions.assertEquals(0, other.summary().totalInspections());
        Assertions.assertTrue(other.byItem().isEmpty());
    }
}
