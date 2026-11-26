package si.plaan;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.request.CreateItemRequest;
import si.plaan.dto.request.CreateOpeningStockRequest;
import si.plaan.dto.request.CreateStockAdjustmentRequest;
import si.plaan.dto.request.CreateWarehouseRequest;
import si.plaan.dto.request.OpeningStockItemRequest;
import si.plaan.dto.request.StockAdjustmentItemRequest;
import si.plaan.dto.response.ItemResponse;
import si.plaan.dto.response.OpeningStockResponse;
import si.plaan.dto.response.StockMovementsReportResponse;
import si.plaan.dto.response.StockMovementsRowResponse;
import si.plaan.dto.response.WarehouseResponse;
import si.plaan.entity.Organization;
import si.plaan.repository.OrganizationRepository;
import si.plaan.service.ItemService;
import si.plaan.service.OpeningStockService;
import si.plaan.service.StockAdjustmentService;
import si.plaan.service.StockMovementsReportService;
import si.plaan.service.WarehouseService;
import si.plaan.service.support.StockMovementSupport;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@SpringBootTest
@Transactional
public class StockMovementsReportTests {

    @Autowired private StockMovementsReportService reportService;
    @Autowired private OpeningStockService openingStockService;
    @Autowired private StockAdjustmentService stockAdjustmentService;
    @Autowired private ItemService itemService;
    @Autowired private WarehouseService warehouseService;
    @Autowired private OrganizationRepository organizationRepository;

    private Organization org1;
    private Organization org2;
    private WarehouseResponse warehouse;
    private ItemResponse board;

    @BeforeEach
    public void setup() {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        org1 = organizationRepository.save(Organization.builder()
                .name("SM Org " + uid).slug("sm-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());
        org2 = organizationRepository.save(Organization.builder()
                .name("SM Other " + uid).slug("sm-o-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());

        warehouse = warehouseService.createWarehouse(org1.getId(), new CreateWarehouseRequest(
                "WH-1", "Raw Material Warehouse", "Bangalore", null, true));
        board = itemService.createItem(org1.getId(), new CreateItemRequest(
                "RM-001", "Wooden Board", null, "Raw Materials", null, null, "Nos", null, true));
    }

    private void postOpening(BigDecimal qty, LocalDate date) {
        OpeningStockResponse draft = openingStockService.createOpeningStock(org1.getId(),
                CreateOpeningStockRequest.builder()
                        .warehouseId(warehouse.id())
                        .openingDate(date)
                        .postImmediately(false)
                        .items(List.of(new OpeningStockItemRequest(board.id(), qty)))
                        .build());
        openingStockService.postOpeningStock(org1.getId(), draft.getId());
    }

    private void postAdjustmentIn(BigDecimal physicalQty, LocalDate date) {
        stockAdjustmentService.createStockAdjustment(org1.getId(), CreateStockAdjustmentRequest.builder()
                .warehouseId(warehouse.id())
                .adjustmentDate(date)
                .reason("Replenishment")
                .postImmediately(true)
                .items(List.of(StockAdjustmentItemRequest.builder()
                        .itemId(board.id())
                        .physicalQuantity(physicalQty)
                        .build()))
                .build());
    }

    @Test
    public void testFocusedBalancesFiltersAndIsolation() {
        LocalDate before = LocalDate.of(2026, 10, 15);
        LocalDate inRange = LocalDate.of(2026, 11, 5);
        LocalDate from = LocalDate.of(2026, 11, 1);
        LocalDate to = LocalDate.of(2026, 11, 30);

        postOpening(new BigDecimal("20"), before);
        postAdjustmentIn(new BigDecimal("120"), inRange); // +100 ADJUSTMENT_IN

        StockMovementsReportResponse focused = reportService.getReport(
                org1.getId(), from, to, board.id(), warehouse.id(), null, null, PageRequest.of(0, 50));

        Assertions.assertTrue(focused.summary().focused());
        Assertions.assertEquals(0, new BigDecimal("20").compareTo(focused.summary().openingBalance()));
        Assertions.assertEquals(0, new BigDecimal("100").compareTo(focused.summary().totalIncoming()));
        Assertions.assertEquals(0, BigDecimal.ZERO.compareTo(focused.summary().totalOutgoing()));
        Assertions.assertEquals(0, new BigDecimal("120").compareTo(focused.summary().closingBalance()));
        Assertions.assertTrue(focused.movements().content().stream().anyMatch(StockMovementsRowResponse::openingBalanceRow));
        Assertions.assertTrue(focused.movements().content().stream()
                .anyMatch(r -> !r.openingBalanceRow() && "Stock Adjustment".equals(r.movementTypeLabel())));
        Assertions.assertEquals(from, focused.movements().content().stream()
                .filter(StockMovementsRowResponse::openingBalanceRow)
                .findFirst()
                .orElseThrow()
                .movementDate());

        StockMovementsReportResponse typeFilter = reportService.getReport(
                org1.getId(), from, to, board.id(), warehouse.id(),
                StockMovementSupport.FILTER_ADJUSTMENT, null, PageRequest.of(0, 50));
        long realRows = typeFilter.movements().content().stream().filter(r -> !r.openingBalanceRow()).count();
        Assertions.assertEquals(1, realRows);
        // Running balance still reflects full chronology (20 + 100)
        StockMovementsRowResponse only = typeFilter.movements().content().stream()
                .filter(r -> !r.openingBalanceRow()).findFirst().orElseThrow();
        Assertions.assertEquals(0, new BigDecimal("120").compareTo(only.runningBalance()));
        Assertions.assertEquals(0, new BigDecimal("20").compareTo(typeFilter.summary().openingBalance()));
        Assertions.assertEquals(0, new BigDecimal("100").compareTo(typeFilter.summary().totalIncoming()));

        StockMovementsReportResponse broad = reportService.getReport(
                org1.getId(), from, to, null, null, null, null, PageRequest.of(0, 50));
        Assertions.assertFalse(broad.summary().focused());
        Assertions.assertTrue(broad.summary().movementCount() >= 1);

        byte[] csv = reportService.exportCsv(org1.getId(), from, to, board.id(), warehouse.id(), null, null);
        String text = new String(csv, StandardCharsets.UTF_8);
        Assertions.assertTrue(text.contains("Wooden Board"));
        Assertions.assertTrue(text.contains("Stock Adjustment"));
        Assertions.assertFalse(text.contains("Opening Balance"));

        StockMovementsReportResponse other = reportService.getReport(
                org2.getId(), from, to, null, null, null, null, PageRequest.of(0, 10));
        Assertions.assertEquals(0, other.summary().movementCount());
    }

    @Test
    public void testMovementTypeHelpers() {
        Assertions.assertTrue(StockMovementSupport.isIncoming("OPENING_STOCK"));
        Assertions.assertTrue(StockMovementSupport.isIncoming("INBOUND_RECEIPT"));
        Assertions.assertFalse(StockMovementSupport.isIncoming("MATERIAL_ISSUE"));
        Assertions.assertFalse(StockMovementSupport.isIncoming("TRANSFER_OUT"));
        Assertions.assertEquals("Goods Receipt", StockMovementSupport.displayLabel("INBOUND_RECEIPT"));
        Assertions.assertEquals(StockMovementSupport.FILTER_TRANSFER_OUT,
                StockMovementSupport.filterKey("TRANSFER_OUT"));
    }
}
