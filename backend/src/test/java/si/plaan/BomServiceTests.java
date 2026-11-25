package si.plaan;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.request.BomItemRequest;
import si.plaan.dto.request.CreateBomRequest;
import si.plaan.dto.request.UpdateBomRequest;
import si.plaan.dto.response.BomItemResponse;
import si.plaan.dto.response.BomResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.entity.BomStatus;
import si.plaan.entity.Item;
import si.plaan.entity.ItemType;
import si.plaan.entity.Organization;
import si.plaan.repository.BomRepository;
import si.plaan.repository.ItemRepository;
import si.plaan.repository.ItemTypeRepository;
import si.plaan.repository.OrganizationRepository;
import si.plaan.repository.StockMovementRepository;
import si.plaan.service.BomService;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@SpringBootTest
@Transactional
class BomServiceTests {

    @Autowired
    private BomService bomService;

    @Autowired
    private BomRepository bomRepository;

    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private ItemTypeRepository itemTypeRepository;

    @Autowired
    private OrganizationRepository organizationRepository;

    @Autowired
    private StockMovementRepository stockMovementRepository;

    private Organization orgA;
    private Organization orgB;

    private Item woodenTableA;
    private Item woodenBoardA;
    private Item woodenLegsA;
    private Item screwsA;

    private Item productB;
    private Item materialB;

    @BeforeEach
    void setUp() {
        orgA = organizationRepository.save(Organization.builder()
                .name("Manufacturing Org A " + UUID.randomUUID())
                .slug("org-a-" + UUID.randomUUID())
                .baseCurrency("INR")
                .active(true)
                .build());

        orgB = organizationRepository.save(Organization.builder()
                .name("Manufacturing Org B " + UUID.randomUUID())
                .slug("org-b-" + UUID.randomUUID())
                .baseCurrency("EUR")
                .active(true)
                .build());

        ItemType finishedGoodTypeA = itemTypeRepository.save(ItemType.builder()
                .organization(orgA)
                .name("Finished Good")
                .build());

        ItemType rawMaterialTypeA = itemTypeRepository.save(ItemType.builder()
                .organization(orgA)
                .name("Raw Material")
                .build());

        ItemType itemTypeB = itemTypeRepository.save(ItemType.builder()
                .organization(orgB)
                .name("General")
                .build());

        woodenTableA = itemRepository.save(Item.builder()
                .organization(orgA)
                .itemCode("PRD-TABLE-" + UUID.randomUUID().toString().substring(0, 5))
                .name("Wooden Table")
                .itemType(finishedGoodTypeA)
                .unitOfMeasure("Nos")
                .active(true)
                .build());

        woodenBoardA = itemRepository.save(Item.builder()
                .organization(orgA)
                .itemCode("MAT-BOARD-" + UUID.randomUUID().toString().substring(0, 5))
                .name("Wooden Board")
                .itemType(rawMaterialTypeA)
                .unitOfMeasure("Nos")
                .active(true)
                .build());

        woodenLegsA = itemRepository.save(Item.builder()
                .organization(orgA)
                .itemCode("MAT-LEGS-" + UUID.randomUUID().toString().substring(0, 5))
                .name("Wooden Legs")
                .itemType(rawMaterialTypeA)
                .unitOfMeasure("Nos")
                .active(true)
                .build());

        screwsA = itemRepository.save(Item.builder()
                .organization(orgA)
                .itemCode("MAT-SCREWS-" + UUID.randomUUID().toString().substring(0, 5))
                .name("Screws")
                .itemType(rawMaterialTypeA)
                .unitOfMeasure("Nos")
                .active(true)
                .build());

        productB = itemRepository.save(Item.builder()
                .organization(orgB)
                .itemCode("PRD-B-" + UUID.randomUUID().toString().substring(0, 5))
                .name("Org B Product")
                .itemType(itemTypeB)
                .unitOfMeasure("kg")
                .active(true)
                .build());

        materialB = itemRepository.save(Item.builder()
                .organization(orgB)
                .itemCode("MAT-B-" + UUID.randomUUID().toString().substring(0, 5))
                .name("Org B Material")
                .itemType(itemTypeB)
                .unitOfMeasure("kg")
                .active(true)
                .build());
    }

    @Test
    void test1_createBomWithMultipleComponents_andVerifyUomAutoPopulation() {
        CreateBomRequest request = CreateBomRequest.builder()
                .productId(woodenTableA.getId())
                .outputQuantity(BigDecimal.ONE)
                .notes("Standard dining table recipe")
                .saveAndActivate(false)
                .items(List.of(
                        new BomItemRequest(woodenBoardA.getId(), BigDecimal.valueOf(1)),
                        new BomItemRequest(woodenLegsA.getId(), BigDecimal.valueOf(4)),
                        new BomItemRequest(screwsA.getId(), BigDecimal.valueOf(16))
                ))
                .build();

        BomResponse response = bomService.createBom(orgA.getId(), request);

        Assertions.assertNotNull(response.getId());
        Assertions.assertTrue(response.getBomCode().startsWith("BOM-"));
        Assertions.assertEquals(woodenTableA.getId(), response.getProductId());
        Assertions.assertEquals("Nos", response.getUnitOfMeasure(), "Product UOM should automatically populate");
        Assertions.assertEquals(BigDecimal.ONE, response.getOutputQuantity());
        Assertions.assertEquals(BomStatus.DRAFT, response.getStatus());
        Assertions.assertEquals(3, response.getTotalComponents());
        Assertions.assertEquals(3, response.getItems().size());

        BomItemResponse boardLine = response.getItems().stream()
                .filter(i -> i.getMaterialId().equals(woodenBoardA.getId()))
                .findFirst().orElseThrow();
        Assertions.assertEquals("Nos", boardLine.getUnitOfMeasure(), "Material UOM should automatically populate");
        Assertions.assertEquals(BigDecimal.valueOf(1), boardLine.getQuantity());
    }

    @Test
    void test2_saveAndEditDraftBom() {
        CreateBomRequest createReq = CreateBomRequest.builder()
                .productId(woodenTableA.getId())
                .outputQuantity(BigDecimal.valueOf(1))
                .saveAndActivate(false)
                .items(List.of(
                        new BomItemRequest(woodenBoardA.getId(), BigDecimal.valueOf(1))
                ))
                .build();

        BomResponse created = bomService.createBom(orgA.getId(), createReq);
        Assertions.assertEquals(1, created.getTotalComponents());

        UpdateBomRequest updateReq = UpdateBomRequest.builder()
                .productId(woodenTableA.getId())
                .outputQuantity(BigDecimal.valueOf(2))
                .notes("Updated batch recipe")
                .saveAndActivate(false)
                .items(List.of(
                        new BomItemRequest(woodenBoardA.getId(), BigDecimal.valueOf(2)),
                        new BomItemRequest(woodenLegsA.getId(), BigDecimal.valueOf(8))
                ))
                .build();

        BomResponse updated = bomService.updateBom(orgA.getId(), created.getId(), updateReq);

        Assertions.assertEquals(BigDecimal.valueOf(2), updated.getOutputQuantity());
        Assertions.assertEquals("Updated batch recipe", updated.getNotes());
        Assertions.assertEquals(2, updated.getTotalComponents());
    }

    @Test
    void test3_activateAndDeactivateBom() {
        CreateBomRequest createReq = CreateBomRequest.builder()
                .productId(woodenTableA.getId())
                .outputQuantity(BigDecimal.ONE)
                .saveAndActivate(false)
                .items(List.of(
                        new BomItemRequest(woodenBoardA.getId(), BigDecimal.valueOf(1)),
                        new BomItemRequest(woodenLegsA.getId(), BigDecimal.valueOf(4))
                ))
                .build();

        BomResponse created = bomService.createBom(orgA.getId(), createReq);
        Assertions.assertEquals(BomStatus.DRAFT, created.getStatus());

        BomResponse activated = bomService.activateBom(orgA.getId(), created.getId());
        Assertions.assertEquals(BomStatus.ACTIVE, activated.getStatus());

        BomResponse activeFetched = bomService.getActiveBomForProduct(orgA.getId(), woodenTableA.getId());
        Assertions.assertNotNull(activeFetched);
        Assertions.assertEquals(activated.getId(), activeFetched.getId());

        BomResponse deactivated = bomService.deactivateBom(orgA.getId(), created.getId());
        Assertions.assertEquals(BomStatus.INACTIVE, deactivated.getStatus());

        BomResponse activeAfterDeactivate = bomService.getActiveBomForProduct(orgA.getId(), woodenTableA.getId());
        Assertions.assertNull(activeAfterDeactivate, "No active BOM should exist after deactivation");
    }

    @Test
    void test4_preventDuplicateComponents() {
        CreateBomRequest duplicateReq = CreateBomRequest.builder()
                .productId(woodenTableA.getId())
                .outputQuantity(BigDecimal.ONE)
                .saveAndActivate(false)
                .items(List.of(
                        new BomItemRequest(woodenBoardA.getId(), BigDecimal.valueOf(1)),
                        new BomItemRequest(woodenBoardA.getId(), BigDecimal.valueOf(2))
                ))
                .build();

        IllegalArgumentException ex = Assertions.assertThrows(
                IllegalArgumentException.class,
                () -> bomService.createBom(orgA.getId(), duplicateReq)
        );
        Assertions.assertTrue(ex.getMessage().toLowerCase().contains("duplicate component"));
    }

    @Test
    void test5_preventProductFromBeingItsOwnComponent() {
        CreateBomRequest selfComponentReq = CreateBomRequest.builder()
                .productId(woodenTableA.getId())
                .outputQuantity(BigDecimal.ONE)
                .saveAndActivate(false)
                .items(List.of(
                        new BomItemRequest(woodenTableA.getId(), BigDecimal.valueOf(1))
                ))
                .build();

        IllegalArgumentException ex = Assertions.assertThrows(
                IllegalArgumentException.class,
                () -> bomService.createBom(orgA.getId(), selfComponentReq)
        );
        Assertions.assertTrue(ex.getMessage().toLowerCase().contains("cannot be its own component"));
    }

    @Test
    void test6_preventMultipleActiveBomsForSameProduct() {
        CreateBomRequest firstActiveReq = CreateBomRequest.builder()
                .productId(woodenTableA.getId())
                .outputQuantity(BigDecimal.ONE)
                .saveAndActivate(true)
                .items(List.of(
                        new BomItemRequest(woodenBoardA.getId(), BigDecimal.valueOf(1))
                ))
                .build();

        BomResponse firstBom = bomService.createBom(orgA.getId(), firstActiveReq);
        Assertions.assertEquals(BomStatus.ACTIVE, firstBom.getStatus());

        CreateBomRequest secondActiveReq = CreateBomRequest.builder()
                .productId(woodenTableA.getId())
                .outputQuantity(BigDecimal.ONE)
                .saveAndActivate(true)
                .items(List.of(
                        new BomItemRequest(woodenLegsA.getId(), BigDecimal.valueOf(4))
                ))
                .build();

        IllegalStateException ex = Assertions.assertThrows(
                IllegalStateException.class,
                () -> bomService.createBom(orgA.getId(), secondActiveReq)
        );
        Assertions.assertTrue(ex.getMessage().toLowerCase().contains("only one active bom"));

        // Creating as draft should succeed
        secondActiveReq.setSaveAndActivate(false);
        BomResponse draftBom = bomService.createBom(orgA.getId(), secondActiveReq);
        Assertions.assertEquals(BomStatus.DRAFT, draftBom.getStatus());

        // Attempting to activate the draft while first is active should fail
        IllegalStateException activateEx = Assertions.assertThrows(
                IllegalStateException.class,
                () -> bomService.activateBom(orgA.getId(), draftBom.getId())
        );
        Assertions.assertTrue(activateEx.getMessage().toLowerCase().contains("active bom already exists"));
    }

    @Test
    void test7_verifyNoStockMovementsAreGenerated() {
        long initialMovementsCount = stockMovementRepository.count();

        CreateBomRequest request = CreateBomRequest.builder()
                .productId(woodenTableA.getId())
                .outputQuantity(BigDecimal.ONE)
                .saveAndActivate(true)
                .items(List.of(
                        new BomItemRequest(woodenBoardA.getId(), BigDecimal.valueOf(1)),
                        new BomItemRequest(woodenLegsA.getId(), BigDecimal.valueOf(4))
                ))
                .build();

        BomResponse response = bomService.createBom(orgA.getId(), request);
        bomService.deactivateBom(orgA.getId(), response.getId());
        bomService.activateBom(orgA.getId(), response.getId());

        long afterMovementsCount = stockMovementRepository.count();
        Assertions.assertEquals(initialMovementsCount, afterMovementsCount,
                "BOM creation, activation, and deactivation must never generate stock movements");
    }

    @Test
    void test8_verifyOrganizationLevelDataIsolation() {
        CreateBomRequest reqA = CreateBomRequest.builder()
                .productId(woodenTableA.getId())
                .outputQuantity(BigDecimal.ONE)
                .saveAndActivate(true)
                .items(List.of(new BomItemRequest(woodenBoardA.getId(), BigDecimal.valueOf(1))))
                .build();
        BomResponse bomA = bomService.createBom(orgA.getId(), reqA);

        CreateBomRequest reqB = CreateBomRequest.builder()
                .productId(productB.getId())
                .outputQuantity(BigDecimal.ONE)
                .saveAndActivate(true)
                .items(List.of(new BomItemRequest(materialB.getId(), BigDecimal.valueOf(2))))
                .build();
        BomResponse bomB = bomService.createBom(orgB.getId(), reqB);

        // Org A cannot see Org B's BOM
        Assertions.assertThrows(
                RuntimeException.class,
                () -> bomService.getBomById(orgA.getId(), bomB.getId())
        );

        // Org B cannot see Org A's BOM
        Assertions.assertThrows(
                RuntimeException.class,
                () -> bomService.getBomById(orgB.getId(), bomA.getId())
        );

        // Org A list contains only Org A BOMs
        PageResponse<BomResponse> pageA = bomService.getBoms(orgA.getId(), null, null, PageRequest.of(0, 10));
        Assertions.assertTrue(pageA.content().stream().allMatch(b -> b.getProductId().equals(woodenTableA.getId())));

        // Cross-tenant item referencing should be prevented
        CreateBomRequest crossTenantReq = CreateBomRequest.builder()
                .productId(productB.getId()) // Belongs to Org B
                .outputQuantity(BigDecimal.ONE)
                .saveAndActivate(false)
                .items(List.of(new BomItemRequest(woodenBoardA.getId(), BigDecimal.valueOf(1)))) // Belongs to Org A
                .build();

        Assertions.assertThrows(
                RuntimeException.class,
                () -> bomService.createBom(orgA.getId(), crossTenantReq)
        );
    }

    @Test
    void test9_deleteDraftBom_andPreventDeletingActiveBom() {
        CreateBomRequest req = CreateBomRequest.builder()
                .productId(woodenTableA.getId())
                .outputQuantity(BigDecimal.ONE)
                .saveAndActivate(false)
                .items(List.of(new BomItemRequest(woodenBoardA.getId(), BigDecimal.valueOf(1))))
                .build();

        BomResponse draft = bomService.createBom(orgA.getId(), req);
        bomService.deleteDraftBom(orgA.getId(), draft.getId());

        Assertions.assertFalse(bomRepository.findById(draft.getId()).isPresent(), "Draft BOM should be deleted");

        CreateBomRequest activeReq = CreateBomRequest.builder()
                .productId(woodenTableA.getId())
                .outputQuantity(BigDecimal.ONE)
                .saveAndActivate(true)
                .items(List.of(new BomItemRequest(woodenBoardA.getId(), BigDecimal.valueOf(1))))
                .build();

        BomResponse active = bomService.createBom(orgA.getId(), activeReq);

        IllegalStateException ex = Assertions.assertThrows(
                IllegalStateException.class,
                () -> bomService.deleteDraftBom(orgA.getId(), active.getId())
        );
        Assertions.assertTrue(ex.getMessage().toLowerCase().contains("only draft boms can be deleted"));
    }
}
