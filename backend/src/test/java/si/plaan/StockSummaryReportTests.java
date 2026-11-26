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
import si.plaan.dto.request.CreateWarehouseRequest;
import si.plaan.dto.request.OpeningStockItemRequest;
import si.plaan.dto.response.ItemResponse;
import si.plaan.dto.response.OpeningStockResponse;
import si.plaan.dto.response.StockSummaryReportResponse;
import si.plaan.dto.response.WarehouseResponse;
import si.plaan.entity.Organization;
import si.plaan.repository.OrganizationRepository;
import si.plaan.service.ItemService;
import si.plaan.service.OpeningStockService;
import si.plaan.service.StockSummaryReportService;
import si.plaan.service.WarehouseService;
import si.plaan.service.impl.InventoryServiceImpl;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@SpringBootTest
@Transactional
public class StockSummaryReportTests {

    @Autowired private StockSummaryReportService reportService;
    @Autowired private OpeningStockService openingStockService;
    @Autowired private ItemService itemService;
    @Autowired private WarehouseService warehouseService;
    @Autowired private OrganizationRepository organizationRepository;

    private Organization org1;
    private Organization org2;
    private WarehouseResponse warehouse;
    private ItemResponse board;
    private ItemResponse legs;

    @BeforeEach
    public void setup() {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        org1 = organizationRepository.save(Organization.builder()
                .name("SS Org " + uid).slug("ss-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());
        org2 = organizationRepository.save(Organization.builder()
                .name("SS Other " + uid).slug("ss-o-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());

        warehouse = warehouseService.createWarehouse(org1.getId(), new CreateWarehouseRequest(
                "WH-1", "Main Store", "Bangalore", null, true));
        board = itemService.createItem(org1.getId(), new CreateItemRequest(
                "RM-001", "Wooden Board", null, "Raw Materials", null, null, "Nos", null, true));
        legs = itemService.createItem(org1.getId(), new CreateItemRequest(
                "RM-002", "Table Legs", null, "Raw Materials", null, null, "Nos", null, true));
    }

    private void postOpening(Long itemId, BigDecimal qty) {
        OpeningStockResponse draft = openingStockService.createOpeningStock(org1.getId(),
                CreateOpeningStockRequest.builder()
                        .warehouseId(warehouse.id())
                        .openingDate(LocalDate.now())
                        .postImmediately(false)
                        .items(List.of(new OpeningStockItemRequest(itemId, qty)))
                        .build());
        openingStockService.postOpeningStock(org1.getId(), draft.getId());
    }

    @Test
    public void testSummaryFiltersCsvAndIsolation() {
        postOpening(board.id(), new BigDecimal("100"));
        postOpening(legs.id(), new BigDecimal("200"));

        StockSummaryReportResponse report = reportService.getReport(
                org1.getId(), null, null, null, null, PageRequest.of(0, 50));
        Assertions.assertEquals(2, report.summary().itemsInStock());
        Assertions.assertEquals(2, report.rows().totalElements());
        Assertions.assertNotNull(report.rows().content().get(0).itemTypeName());

        StockSummaryReportResponse available = reportService.getReport(
                org1.getId(), null, null, null,
                InventoryServiceImpl.STOCK_STATUS_AVAILABLE, PageRequest.of(0, 50));
        Assertions.assertEquals(2, available.rows().totalElements());

        StockSummaryReportResponse search = reportService.getReport(
                org1.getId(), "board", null, null, null, PageRequest.of(0, 50));
        Assertions.assertEquals(1, search.rows().totalElements());
        Assertions.assertEquals("RM-001", search.rows().content().get(0).itemCode());

        StockSummaryReportResponse byType = reportService.getReport(
                org1.getId(), null, null, board.itemType().id(), null, PageRequest.of(0, 50));
        Assertions.assertTrue(byType.rows().content().stream()
                .allMatch(r -> r.itemTypeId().equals(board.itemType().id())));

        byte[] csv = reportService.exportCsv(org1.getId(), null, null, null, null);
        String text = new String(csv, StandardCharsets.UTF_8);
        Assertions.assertTrue(text.contains("RM-001"));
        Assertions.assertTrue(text.contains("Wooden Board"));

        StockSummaryReportResponse other = reportService.getReport(
                org2.getId(), null, null, null, null, PageRequest.of(0, 10));
        Assertions.assertEquals(0, other.summary().itemsInStock());
        Assertions.assertEquals(0, other.rows().totalElements());
    }
}
