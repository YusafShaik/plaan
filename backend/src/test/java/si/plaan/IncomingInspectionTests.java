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
import si.plaan.repository.OrganizationRepository;
import si.plaan.repository.StockMovementRepository;
import si.plaan.service.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@SpringBootTest
@Transactional
public class IncomingInspectionTests {

    @Autowired private IncomingInspectionService incomingInspectionService;
    @Autowired private InspectionTemplateService inspectionTemplateService;
    @Autowired private GoodsReceiptService goodsReceiptService;
    @Autowired private PurchaseOrderService purchaseOrderService;
    @Autowired private ItemService itemService;
    @Autowired private SupplierService supplierService;
    @Autowired private WarehouseService warehouseService;
    @Autowired private InventoryService inventoryService;
    @Autowired private StockAvailabilityService stockAvailabilityService;
    @Autowired private OrganizationRepository organizationRepository;
    @Autowired private StockMovementRepository stockMovementRepository;

    private Organization org1;
    private Organization org2;
    private SupplierResponse supplier;
    private WarehouseResponse warehouse;
    private ItemResponse board;
    private ItemResponse screws;

    @BeforeEach
    public void setup() {
        String uid = UUID.randomUUID().toString().substring(0, 8);

        org1 = organizationRepository.save(Organization.builder()
                .name("IQC Org " + uid).slug("iqc-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());
        org2 = organizationRepository.save(Organization.builder()
                .name("IQC Other " + uid).slug("iqc-o-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());

        supplier = supplierService.createSupplier(org1.getId(), new CreateSupplierRequest(
                "SUP-IQC", "ABC Timber", null, null, null, null, null, true));
        warehouse = warehouseService.createWarehouse(org1.getId(), new CreateWarehouseRequest(
                "WH-RM", "Raw Material Store", "Bangalore", "Yard", true));
        board = itemService.createItem(org1.getId(), new CreateItemRequest(
                "ITM-BOARD", "Wooden Board", null, "Raw Materials", null, null, "Nos", null, true));
        screws = itemService.createItem(org1.getId(), new CreateItemRequest(
                "ITM-SCRW", "Screws", null, "Consumables", null, null, "Nos", null, true));
    }

    private List<InspectionTemplateParameterRequest> params() {
        return List.of(
                new InspectionTemplateParameterRequest("Surface Finish", "No visible surface defects"),
                new InspectionTemplateParameterRequest("Dimensions", "Matches specified dimensions"),
                new InspectionTemplateParameterRequest("Physical Condition", "No cracks or physical damage")
        );
    }

    private GoodsReceiptResponse postGrn(Long itemId, BigDecimal qty) {
        PurchaseOrderResponse po = purchaseOrderService.createPurchaseOrder(org1.getId(),
                new CreatePurchaseOrderRequest(
                        null, supplier.id(), warehouse.id(), LocalDate.now(), null, "IQC PO",
                        PurchaseOrderStatus.ISSUED,
                        List.of(new PurchaseOrderItemRequest(itemId, qty, BigDecimal.TEN))));
        GoodsReceiptResponse draft = goodsReceiptService.createGoodsReceipt(org1.getId(),
                new CreateGoodsReceiptRequest(
                        null, po.id(), LocalDate.now(), null, null, GoodsReceiptStatus.DRAFT,
                        List.of(new GoodsReceiptItemRequest(po.items().get(0).id(), itemId, qty))));
        return goodsReceiptService.postGoodsReceipt(org1.getId(), draft.id());
    }

    @Test
    public void testAutoCreatePendingFromGrnWhenActiveTemplate() {
        inspectionTemplateService.create(org1.getId(), new CreateInspectionTemplateRequest(
                null, "Board Incoming QC", board.id(), InspectionType.INCOMING, null, true, params()));

        GoodsReceiptResponse grn = postGrn(board.id(), new BigDecimal("100.000"));

        PageResponse<IncomingInspectionResponse> page = incomingInspectionService.getInspections(
                org1.getId(), null, IncomingInspectionStatus.PENDING, PageRequest.of(0, 10));
        Assertions.assertEquals(1, page.totalElements());
        IncomingInspectionResponse iqc = page.content().get(0);
        Assertions.assertEquals(grn.grnNumber(), iqc.grnNumber());
        Assertions.assertEquals(board.id(), iqc.itemId());
        Assertions.assertEquals(0, new BigDecimal("100.000").compareTo(iqc.receivedQuantity()));
        Assertions.assertEquals(3, iqc.parameters().size());
        Assertions.assertTrue(iqc.parameters().stream().allMatch(p -> p.result() == null));

        // No template for screws → no IQC
        postGrn(screws.id(), new BigDecimal("500.000"));
        PageResponse<IncomingInspectionResponse> all = incomingInspectionService.getInspections(
                org1.getId(), null, null, PageRequest.of(0, 20));
        Assertions.assertEquals(1, all.totalElements());
    }

    @Test
    public void testHoldReleaseAndRejectedStock() {
        inspectionTemplateService.create(org1.getId(), new CreateInspectionTemplateRequest(
                null, "Board Incoming QC", board.id(), InspectionType.INCOMING, null, true, params()));

        postGrn(board.id(), new BigDecimal("100.000"));

        BigDecimal onHand = stockAvailabilityService.getOnHand(org1.getId(), board.id(), warehouse.id());
        Assertions.assertEquals(0, new BigDecimal("100.000").compareTo(onHand));
        Assertions.assertEquals(0, new BigDecimal("100.000").compareTo(
                stockAvailabilityService.getPendingInspection(org1.getId(), board.id(), warehouse.id())));
        Assertions.assertEquals(0, BigDecimal.ZERO.compareTo(
                stockAvailabilityService.getAvailable(org1.getId(), board.id(), warehouse.id())));

        IncomingInspectionResponse pending = incomingInspectionService.getInspections(
                org1.getId(), null, null, PageRequest.of(0, 1)).content().get(0);

        // Draft does not release stock
        List<IncomingInspectionParameterResultRequest> passFail = List.of(
                new IncomingInspectionParameterResultRequest(pending.parameters().get(0).id(), InspectionParameterResult.PASS),
                new IncomingInspectionParameterResultRequest(pending.parameters().get(1).id(), InspectionParameterResult.PASS),
                new IncomingInspectionParameterResultRequest(pending.parameters().get(2).id(), InspectionParameterResult.FAIL)
        );
        incomingInspectionService.update(org1.getId(), pending.id(), null,
                new UpdateIncomingInspectionRequest(
                        LocalDate.now(), new BigDecimal("90.000"),
                        "10 boards rejected due to physical damage", false, passFail));
        Assertions.assertEquals(0, new BigDecimal("100.000").compareTo(
                stockAvailabilityService.getPendingInspection(org1.getId(), board.id(), warehouse.id())));
        Assertions.assertEquals(0, BigDecimal.ZERO.compareTo(
                stockAvailabilityService.getAvailable(org1.getId(), board.id(), warehouse.id())));

        long movementsBefore = stockMovementRepository.count();
        IncomingInspectionResponse completed = incomingInspectionService.complete(
                org1.getId(), pending.id(), null,
                new UpdateIncomingInspectionRequest(
                        LocalDate.now(), new BigDecimal("90.000"),
                        "10 boards rejected due to physical damage", true, passFail));

        Assertions.assertEquals(IncomingInspectionStatus.COMPLETED, completed.status());
        Assertions.assertEquals(0, new BigDecimal("90.000").compareTo(completed.acceptedQuantity()));
        Assertions.assertEquals(0, new BigDecimal("10.000").compareTo(completed.rejectedQuantity()));
        Assertions.assertEquals(movementsBefore, stockMovementRepository.count());

        Assertions.assertEquals(0, new BigDecimal("100.000").compareTo(
                stockAvailabilityService.getOnHand(org1.getId(), board.id(), warehouse.id())));
        Assertions.assertEquals(0, BigDecimal.ZERO.compareTo(
                stockAvailabilityService.getPendingInspection(org1.getId(), board.id(), warehouse.id())));
        Assertions.assertEquals(0, new BigDecimal("10.000").compareTo(
                stockAvailabilityService.getRejected(org1.getId(), board.id(), warehouse.id())));
        Assertions.assertEquals(0, new BigDecimal("90.000").compareTo(
                stockAvailabilityService.getAvailable(org1.getId(), board.id(), warehouse.id())));

        PageResponse<StockOverviewItemResponse> overview = inventoryService.getStockOverview(
                org1.getId(), null, warehouse.id(), null, null, PageRequest.of(0, 10));
        StockOverviewItemResponse row = overview.content().stream()
                .filter(r -> r.itemId().equals(board.id()))
                .findFirst()
                .orElseThrow();
        Assertions.assertEquals(0, new BigDecimal("100.000").compareTo(row.onHandQuantity()));
        Assertions.assertEquals(0, BigDecimal.ZERO.compareTo(row.pendingInspectionQuantity()));
        Assertions.assertEquals(0, new BigDecimal("10.000").compareTo(row.rejectedQuantity()));
        Assertions.assertEquals(0, new BigDecimal("90.000").compareTo(row.availableQuantity()));
    }

    @Test
    public void testCompletionValidationAndDuplicatePrevented() {
        inspectionTemplateService.create(org1.getId(), new CreateInspectionTemplateRequest(
                null, "Board Incoming QC", board.id(), InspectionType.INCOMING, null, true, params()));
        postGrn(board.id(), new BigDecimal("100.000"));

        IncomingInspectionResponse pending = incomingInspectionService.getInspections(
                org1.getId(), null, null, PageRequest.of(0, 1)).content().get(0);

        List<IncomingInspectionParameterResultRequest> incomplete = List.of(
                new IncomingInspectionParameterResultRequest(pending.parameters().get(0).id(), InspectionParameterResult.PASS)
        );
        Assertions.assertThrows(IllegalArgumentException.class, () ->
                incomingInspectionService.complete(org1.getId(), pending.id(), null,
                        new UpdateIncomingInspectionRequest(
                                LocalDate.now(), new BigDecimal("100.000"), null, true, incomplete)));

        List<IncomingInspectionParameterResultRequest> allPass = pending.parameters().stream()
                .map(p -> new IncomingInspectionParameterResultRequest(p.id(), InspectionParameterResult.PASS))
                .toList();

        Assertions.assertThrows(IllegalArgumentException.class, () ->
                incomingInspectionService.complete(org1.getId(), pending.id(), null,
                        new UpdateIncomingInspectionRequest(
                                LocalDate.now(), new BigDecimal("90.000"), null, true, allPass)));

        IncomingInspectionResponse done = incomingInspectionService.complete(
                org1.getId(), pending.id(), null,
                new UpdateIncomingInspectionRequest(
                        LocalDate.now(), new BigDecimal("100.000"), null, true, allPass));
        Assertions.assertEquals(IncomingInspectionStatus.COMPLETED, done.status());

        Assertions.assertThrows(IllegalStateException.class, () ->
                incomingInspectionService.complete(org1.getId(), pending.id(), null,
                        new UpdateIncomingInspectionRequest(
                                LocalDate.now(), new BigDecimal("100.000"), null, true, allPass)));

        Assertions.assertThrows(IllegalStateException.class, () ->
                incomingInspectionService.update(org1.getId(), pending.id(), null,
                        new UpdateIncomingInspectionRequest(
                                LocalDate.now(), new BigDecimal("100.000"), null, false, allPass)));
    }

    @Test
    public void testTenantIsolation() {
        inspectionTemplateService.create(org1.getId(), new CreateInspectionTemplateRequest(
                null, "Board Incoming QC", board.id(), InspectionType.INCOMING, null, true, params()));
        postGrn(board.id(), new BigDecimal("100.000"));

        IncomingInspectionResponse iqc = incomingInspectionService.getInspections(
                org1.getId(), null, null, PageRequest.of(0, 1)).content().get(0);

        Assertions.assertThrows(ResourceNotFoundException.class, () ->
                incomingInspectionService.getById(org2.getId(), iqc.id()));

        PageResponse<IncomingInspectionResponse> org2List = incomingInspectionService.getInspections(
                org2.getId(), null, null, PageRequest.of(0, 10));
        Assertions.assertEquals(0, org2List.totalElements());
    }
}
