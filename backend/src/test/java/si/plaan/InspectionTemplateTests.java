package si.plaan;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.request.CreateInspectionTemplateRequest;
import si.plaan.dto.request.InspectionTemplateParameterRequest;
import si.plaan.dto.request.UpdateInspectionTemplateRequest;
import si.plaan.dto.response.InspectionTemplateResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.entity.*;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.ItemRepository;
import si.plaan.repository.ItemTypeRepository;
import si.plaan.repository.OrganizationRepository;
import si.plaan.service.InspectionTemplateService;

import java.util.List;
import java.util.UUID;

@SpringBootTest
@Transactional
public class InspectionTemplateTests {

    @Autowired private InspectionTemplateService inspectionTemplateService;
    @Autowired private OrganizationRepository organizationRepository;
    @Autowired private ItemRepository itemRepository;
    @Autowired private ItemTypeRepository itemTypeRepository;

    private Organization org1;
    private Organization org2;
    private Item table;
    private Item board;
    private Item inactiveItem;

    @BeforeEach
    public void setup() {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        org1 = organizationRepository.save(Organization.builder()
                .name("QT Org " + uid).slug("qt-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());
        org2 = organizationRepository.save(Organization.builder()
                .name("QT Other " + uid).slug("qt-o-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());

        ItemType type = itemTypeRepository.save(ItemType.builder()
                .organization(org1).name("Finished Good").build());

        table = itemRepository.save(Item.builder()
                .organization(org1).itemCode("ITM-T-" + uid).name("Wooden Table")
                .itemType(type).unitOfMeasure("Nos").active(true).build());
        board = itemRepository.save(Item.builder()
                .organization(org1).itemCode("ITM-B-" + uid).name("Wooden Board")
                .itemType(type).unitOfMeasure("Nos").active(true).build());
        inactiveItem = itemRepository.save(Item.builder()
                .organization(org1).itemCode("ITM-X-" + uid).name("Retired Part")
                .itemType(type).unitOfMeasure("Nos").active(false).build());
    }

    private List<InspectionTemplateParameterRequest> sampleParams() {
        return List.of(
                new InspectionTemplateParameterRequest("Surface Finish", "No scratches or cracks"),
                new InspectionTemplateParameterRequest("Dimensions", "Matches product specifications")
        );
    }

    @Test
    public void testCreateActivateAndLifecycle() {
        InspectionTemplateResponse draft = inspectionTemplateService.create(org1.getId(),
                new CreateInspectionTemplateRequest(
                        null, "Wooden Table Quality Check", table.getId(),
                        InspectionType.FINISHED_GOODS, null, false, sampleParams()));
        Assertions.assertTrue(draft.templateCode().startsWith("QT-"));
        Assertions.assertEquals(InspectionTemplateStatus.DRAFT, draft.status());
        Assertions.assertEquals(2, draft.parametersCount());

        InspectionTemplateResponse active = inspectionTemplateService.activate(org1.getId(), draft.id());
        Assertions.assertEquals(InspectionTemplateStatus.ACTIVE, active.status());

        Assertions.assertThrows(IllegalStateException.class, () ->
                inspectionTemplateService.update(org1.getId(), active.id(),
                        new UpdateInspectionTemplateRequest(
                                "Changed", table.getId(), InspectionType.FINISHED_GOODS,
                                null, false, sampleParams())));

        InspectionTemplateResponse inactive = inspectionTemplateService.deactivate(org1.getId(), active.id());
        Assertions.assertEquals(InspectionTemplateStatus.INACTIVE, inactive.status());

        Assertions.assertThrows(IllegalStateException.class, () ->
                inspectionTemplateService.deleteDraft(org1.getId(), inactive.id()));
    }

    @Test
    public void testOneActivePerItemAndType() {
        inspectionTemplateService.create(org1.getId(), new CreateInspectionTemplateRequest(
                null, "Table FG Check", table.getId(), InspectionType.FINISHED_GOODS,
                null, true, sampleParams()));

        Assertions.assertThrows(IllegalStateException.class, () ->
                inspectionTemplateService.create(org1.getId(), new CreateInspectionTemplateRequest(
                        null, "Table FG Check 2", table.getId(), InspectionType.FINISHED_GOODS,
                        null, true, sampleParams())));

        // Different type allowed
        InspectionTemplateResponse incoming = inspectionTemplateService.create(org1.getId(),
                new CreateInspectionTemplateRequest(
                        null, "Table Incoming", table.getId(), InspectionType.INCOMING,
                        null, true, sampleParams()));
        Assertions.assertEquals(InspectionTemplateStatus.ACTIVE, incoming.status());
    }

    @Test
    public void testDuplicateParametersAndInactiveItem() {
        Assertions.assertThrows(IllegalArgumentException.class, () ->
                inspectionTemplateService.create(org1.getId(), new CreateInspectionTemplateRequest(
                        null, "Bad params", board.getId(), InspectionType.INCOMING, null, true,
                        List.of(
                                new InspectionTemplateParameterRequest("Surface", "A"),
                                new InspectionTemplateParameterRequest("surface", "B")
                        ))));

        Assertions.assertThrows(IllegalArgumentException.class, () ->
                inspectionTemplateService.create(org1.getId(), new CreateInspectionTemplateRequest(
                        null, "Inactive item", inactiveItem.getId(), InspectionType.INCOMING,
                        null, false, sampleParams())));

        Assertions.assertThrows(IllegalArgumentException.class, () ->
                inspectionTemplateService.create(org1.getId(), new CreateInspectionTemplateRequest(
                        null, "No params", board.getId(), InspectionType.INCOMING,
                        null, true, List.of())));
    }

    @Test
    public void testDraftDeleteAndTenantIsolation() {
        InspectionTemplateResponse draft = inspectionTemplateService.create(org1.getId(),
                new CreateInspectionTemplateRequest(
                        null, "Board Incoming", board.getId(), InspectionType.INCOMING,
                        null, false, sampleParams()));

        inspectionTemplateService.deleteDraft(org1.getId(), draft.id());
        Assertions.assertThrows(ResourceNotFoundException.class, () ->
                inspectionTemplateService.getById(org1.getId(), draft.id()));

        InspectionTemplateResponse kept = inspectionTemplateService.create(org1.getId(),
                new CreateInspectionTemplateRequest(
                        null, "Board Incoming 2", board.getId(), InspectionType.INCOMING,
                        null, true, sampleParams()));

        Assertions.assertThrows(ResourceNotFoundException.class, () ->
                inspectionTemplateService.getById(org2.getId(), kept.id()));

        PageResponse<InspectionTemplateResponse> org2List = inspectionTemplateService.getTemplates(
                org2.getId(), null, null, null, PageRequest.of(0, 10));
        Assertions.assertEquals(0, org2List.totalElements());
    }
}
