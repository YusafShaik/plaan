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
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@SpringBootTest
@Transactional
public class RejectionReportTests {

    @Autowired private RejectionReportService reportService;
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
    private SupplierResponse timber;
    private SupplierResponse hardware;
    private WarehouseResponse warehouse;
    private ItemResponse board;
    private ItemResponse legs;
    private Warehouse sourceWarehouse;
    private Warehouse fgWarehouse;
    private Item productItem;
    private Item rawBoard;
    private Item rawScrew;

    @BeforeEach
    void setup() {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        org1 = organizationRepository.save(Organization.builder()
                .name("RR Org " + uid).slug("rr-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());
        org2 = organizationRepository.save(Organization.builder()
                .name("RR Other " + uid).slug("rr-o-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());

        timber = supplierService.createSupplier(org1.getId(), new CreateSupplierRequest(
                "SUP-T", "ABC Timber", null, null, null, null, null, true));
        hardware = supplierService.createSupplier(org1.getId(), new CreateSupplierRequest(
                "SUP-H", "XYZ Hardware", null, null, null, null, null, true));
        warehouse = warehouseService.createWarehouse(org1.getId(), new CreateWarehouseRequest(
                "WH-RM", "Raw Material Store", "Bangalore", null, true));
        board = itemService.createItem(org1.getId(), new CreateItemRequest(
                "ITM-BOARD", "Wooden Board", null, "Raw Materials", null, null, "Nos", null, true));
        legs = itemService.createItem(org1.getId(), new CreateItemRequest(
                "ITM-LEGS", "Table Legs", null, "Raw Materials", null, null, "Nos", null, true));

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

    private GoodsReceiptResponse postGrn(Long supplierId, Long itemId, BigDecimal qty) {
        PurchaseOrderResponse po = purchaseOrderService.createPurchaseOrder(org1.getId(),
                new CreatePurchaseOrderRequest(
                        null, supplierId, warehouse.id(), LocalDate.of(2026, 11, 2), null, null,
                        PurchaseOrderStatus.ISSUED,
                        List.of(new PurchaseOrderItemRequest(itemId, qty, BigDecimal.TEN))));
        GoodsReceiptResponse draft = goodsReceiptService.createGoodsReceipt(org1.getId(),
                new CreateGoodsReceiptRequest(
                        null, po.id(), LocalDate.of(2026, 11, 3), null, null, GoodsReceiptStatus.DRAFT,
                        List.of(new GoodsReceiptItemRequest(po.items().get(0).id(), itemId, qty))));
        return goodsReceiptService.postGoodsReceipt(org1.getId(), draft.id());
    }

    private IncomingInspectionResponse completeIqc(
            IncomingInspectionResponse pending,
            BigDecimal accepted,
            LocalDate date,
            boolean failFirstParam) {
        List<IncomingInspectionParameterResultRequest> results = new ArrayList<>();
        for (int i = 0; i < pending.parameters().size(); i++) {
            results.add(new IncomingInspectionParameterResultRequest(
                    pending.parameters().get(i).id(),
                    failFirstParam && i == 0 ? InspectionParameterResult.FAIL : InspectionParameterResult.PASS));
        }
        return incomingInspectionService.complete(org1.getId(), pending.id(), null,
                new UpdateIncomingInspectionRequest(date, accepted, "Surface cracks", true, results));
    }

    @Test
    public void testRejectionSummaryFiltersRemarksAndIsolation() {
        inspectionTemplateService.create(org1.getId(), new CreateInspectionTemplateRequest(
                null, "Board Incoming QC", board.id(), InspectionType.INCOMING, null, true, params()));
        inspectionTemplateService.create(org1.getId(), new CreateInspectionTemplateRequest(
                null, "Legs Incoming QC", legs.id(), InspectionType.INCOMING, null, true, params()));
        inspectionTemplateService.create(org1.getId(), new CreateInspectionTemplateRequest(
                null, "Table FG QC", productItem.getId(), InspectionType.FINISHED_GOODS, null, true, params()));

        postGrn(timber.id(), board.id(), new BigDecimal("100"));
        postGrn(hardware.id(), legs.id(), new BigDecimal("200"));
        // Zero-rejection completion should not appear in rejection report
        postGrn(timber.id(), board.id(), new BigDecimal("50"));

        IncomingInspectionResponse boardPending = incomingInspectionService.getInspections(
                org1.getId(), "Wooden Board", IncomingInspectionStatus.PENDING, PageRequest.of(0, 5))
                .content().stream()
                .filter(i -> i.receivedQuantity().compareTo(new BigDecimal("100")) == 0)
                .findFirst()
                .orElseThrow();
        IncomingInspectionResponse legsPending = incomingInspectionService.getInspections(
                org1.getId(), "Table Legs", IncomingInspectionStatus.PENDING, PageRequest.of(0, 1))
                .content().get(0);
        IncomingInspectionResponse cleanPending = incomingInspectionService.getInspections(
                org1.getId(), "Wooden Board", IncomingInspectionStatus.PENDING, PageRequest.of(0, 5))
                .content().stream()
                .filter(i -> i.receivedQuantity().compareTo(new BigDecimal("50")) == 0)
                .findFirst()
                .orElseThrow();

        IncomingInspectionResponse boardRejected = completeIqc(
                boardPending, new BigDecimal("90"), LocalDate.of(2026, 11, 10), true);
        IncomingInspectionResponse legsRejected = completeIqc(
                legsPending, new BigDecimal("195"), LocalDate.of(2026, 11, 12), false);
        // Full accept — excluded from rejection report
        List<IncomingInspectionParameterResultRequest> allPass = cleanPending.parameters().stream()
                .map(p -> new IncomingInspectionParameterResultRequest(p.id(), InspectionParameterResult.PASS))
                .toList();
        incomingInspectionService.complete(org1.getId(), cleanPending.id(), null,
                new UpdateIncomingInspectionRequest(
                        LocalDate.of(2026, 11, 14), new BigDecimal("50"), null, true, allPass));

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
        FinishedGoodsInspectionResponse fgiRejected = finishedGoodsInspectionService.complete(
                org1.getId(), fgiPending.id(), null,
                new UpdateFinishedGoodsInspectionRequest(
                        LocalDate.of(2026, 11, 15), new BigDecimal("8"), "Unstable assembly", true, fgiResults));

        LocalDate from = LocalDate.of(2026, 11, 1);
        LocalDate to = LocalDate.of(2026, 11, 30);

        RejectionReportResponse report = reportService.getReport(
                org1.getId(), from, to, null, null, null, null, null, PageRequest.of(0, 50));

        Assertions.assertEquals(3, report.summary().inspectionsWithRejections());
        Assertions.assertEquals(3, report.summary().affectedItems());
        Assertions.assertEquals(2, report.summary().incomingRejections());
        Assertions.assertEquals(1, report.summary().finishedGoodsRejections());
        Assertions.assertEquals(3, report.rejections().totalElements());
        Assertions.assertFalse(report.rejections().content().stream()
                .anyMatch(r -> r.inspectionNumber().equals(
                        incomingInspectionService.getInspections(
                                org1.getId(), null, IncomingInspectionStatus.COMPLETED, PageRequest.of(0, 20))
                                .content().stream()
                                .filter(i -> i.receivedQuantity().compareTo(new BigDecimal("50")) == 0)
                                .findFirst()
                                .orElseThrow()
                                .inspectionNumber())));

        RejectionReportRowResponse boardRow = report.rejections().content().stream()
                .filter(r -> r.id().equals(boardRejected.id()))
                .findFirst()
                .orElseThrow();
        Assertions.assertEquals("ABC Timber", boardRow.supplierName());
        Assertions.assertEquals(0, new BigDecimal("10").compareTo(boardRow.rejectedQuantity()));
        Assertions.assertEquals(0, new BigDecimal("10.0").compareTo(boardRow.rejectionRate()));
        Assertions.assertEquals("Surface cracks", boardRow.remarks());
        Assertions.assertTrue(boardRow.failedParameters().contains("Surface Finish"));
        Assertions.assertNotNull(boardRow.sourceReference());

        RejectionReportRowResponse legsRow = report.rejections().content().stream()
                .filter(r -> r.id().equals(legsRejected.id()))
                .findFirst()
                .orElseThrow();
        Assertions.assertEquals("XYZ Hardware", legsRow.supplierName());
        Assertions.assertEquals(0, new BigDecimal("2.5").compareTo(legsRow.rejectionRate()));

        RejectionReportRowResponse fgiRow = report.rejections().content().stream()
                .filter(r -> r.id().equals(fgiRejected.id()))
                .findFirst()
                .orElseThrow();
        Assertions.assertEquals(order.getOrderNumber(), fgiRow.productionOrderNumber());
        Assertions.assertEquals("Unstable assembly", fgiRow.remarks());
        Assertions.assertEquals(0, new BigDecimal("20.0").compareTo(fgiRow.rejectionRate()));

        Assertions.assertTrue(report.remarks().size() >= 3);

        RejectionReportResponse incomingOnly = reportService.getReport(
                org1.getId(), from, to, InspectionType.INCOMING, null, null, null, null, PageRequest.of(0, 20));
        Assertions.assertEquals(2, incomingOnly.summary().inspectionsWithRejections());
        Assertions.assertEquals(0, incomingOnly.summary().finishedGoodsRejections());

        RejectionReportResponse timberOnly = reportService.getReport(
                org1.getId(), from, to, null, null, null, timber.id(), null, PageRequest.of(0, 20));
        Assertions.assertEquals(1, timberOnly.summary().inspectionsWithRejections());
        Assertions.assertEquals(boardRejected.inspectionNumber(),
                timberOnly.rejections().content().get(0).inspectionNumber());

        RejectionReportResponse poOnly = reportService.getReport(
                org1.getId(), from, to, null, null, null, null, order.getId(), PageRequest.of(0, 20));
        Assertions.assertEquals(1, poOnly.summary().inspectionsWithRejections());
        Assertions.assertEquals(1, poOnly.summary().finishedGoodsRejections());

        RejectionReportResponse itemOnly = reportService.getReport(
                org1.getId(), from, to, null, board.id(), null, null, null, PageRequest.of(0, 20));
        Assertions.assertEquals(1, itemOnly.summary().inspectionsWithRejections());

        byte[] csv = reportService.exportCsv(org1.getId(), from, to, null, null, null, null, null);
        String text = new String(csv, StandardCharsets.UTF_8);
        Assertions.assertTrue(text.contains(boardRejected.inspectionNumber()));
        Assertions.assertTrue(text.contains("Surface cracks"));
        Assertions.assertTrue(text.contains("Surface Finish"));
        Assertions.assertTrue(text.contains(fgiRejected.inspectionNumber()));

        RejectionReportResponse other = reportService.getReport(
                org2.getId(), from, to, null, null, null, null, null, PageRequest.of(0, 10));
        Assertions.assertEquals(0, other.summary().inspectionsWithRejections());
        Assertions.assertEquals(0, other.rejections().totalElements());
    }
}
