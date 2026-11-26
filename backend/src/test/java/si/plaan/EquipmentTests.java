package si.plaan;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.request.CreateEquipmentRequest;
import si.plaan.dto.request.UpdateEquipmentRequest;
import si.plaan.dto.response.EquipmentResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.entity.EquipmentOperationalStatus;
import si.plaan.entity.EquipmentRecordStatus;
import si.plaan.entity.Organization;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.OrganizationRepository;
import si.plaan.service.EquipmentService;

import java.time.LocalDate;
import java.util.UUID;

@SpringBootTest
@Transactional
public class EquipmentTests {

    @Autowired private EquipmentService equipmentService;
    @Autowired private OrganizationRepository organizationRepository;

    private Organization org1;
    private Organization org2;

    @BeforeEach
    public void setup() {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        org1 = organizationRepository.save(Organization.builder()
                .name("EQ Org " + uid).slug("eq-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());
        org2 = organizationRepository.save(Organization.builder()
                .name("EQ Other " + uid).slug("eq-o-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());
    }

    @Test
    public void testCreateUpdateActivateDeactivateAndSearch() {
        String next = equipmentService.getNextEquipmentCode(org1.getId());
        Assertions.assertTrue(next.startsWith("EQ-"));

        EquipmentResponse created = equipmentService.create(org1.getId(), new CreateEquipmentRequest(
                null,
                "Wood Cutting Machine",
                "ABC Machinery",
                "WCM-200",
                "SN-2026001",
                "Cutting Area",
                LocalDate.of(2026, 1, 1),
                "Primary cutting line",
                EquipmentOperationalStatus.OPERATIONAL,
                EquipmentRecordStatus.ACTIVE
        ));
        Assertions.assertEquals(next, created.equipmentCode());
        Assertions.assertEquals(EquipmentOperationalStatus.OPERATIONAL, created.operationalStatus());
        Assertions.assertEquals(EquipmentRecordStatus.ACTIVE, created.recordStatus());

        EquipmentResponse updated = equipmentService.update(org1.getId(), created.id(),
                new UpdateEquipmentRequest(
                        "Wood Cutting Machine",
                        "ABC Machinery",
                        "WCM-200",
                        "SN-2026001",
                        "Cutting Area",
                        LocalDate.of(2026, 1, 1),
                        "Updated description",
                        EquipmentOperationalStatus.UNDER_MAINTENANCE,
                        EquipmentRecordStatus.ACTIVE
                ));
        Assertions.assertEquals(EquipmentOperationalStatus.UNDER_MAINTENANCE, updated.operationalStatus());
        Assertions.assertEquals("Updated description", updated.description());

        EquipmentResponse inactive = equipmentService.deactivate(org1.getId(), created.id());
        Assertions.assertEquals(EquipmentRecordStatus.INACTIVE, inactive.recordStatus());

        EquipmentResponse activeAgain = equipmentService.activate(org1.getId(), created.id());
        Assertions.assertEquals(EquipmentRecordStatus.ACTIVE, activeAgain.recordStatus());

        PageResponse<EquipmentResponse> search = equipmentService.getEquipment(
                org1.getId(), "cutting", EquipmentOperationalStatus.OPERATIONAL, null, PageRequest.of(0, 10));
        // After activate, operational status still UNDER_MAINTENANCE from last update
        Assertions.assertEquals(0, search.totalElements());

        PageResponse<EquipmentResponse> byStatus = equipmentService.getEquipment(
                org1.getId(), "Wood", EquipmentOperationalStatus.UNDER_MAINTENANCE, null, PageRequest.of(0, 10));
        Assertions.assertEquals(1, byStatus.totalElements());
    }

    @Test
    public void testUniqueCodeAndTenantIsolation() {
        EquipmentResponse eq = equipmentService.create(org1.getId(), new CreateEquipmentRequest(
                "EQ-001", "Drilling Machine", null, null, null, "Assembly Area",
                null, null, null, null));

        Assertions.assertThrows(IllegalArgumentException.class, () ->
                equipmentService.create(org1.getId(), new CreateEquipmentRequest(
                        "eq-001", "Another Drill", null, null, null, null, null, null, null, null)));

        // Same code allowed in another org
        EquipmentResponse other = equipmentService.create(org2.getId(), new CreateEquipmentRequest(
                "EQ-001", "Other Org Drill", null, null, null, null, null, null, null, null));
        Assertions.assertEquals("EQ-001", other.equipmentCode());

        Assertions.assertThrows(ResourceNotFoundException.class, () ->
                equipmentService.getById(org2.getId(), eq.id()));

        PageResponse<EquipmentResponse> org2List = equipmentService.getEquipment(
                org2.getId(), null, null, null, PageRequest.of(0, 10));
        Assertions.assertEquals(1, org2List.totalElements());
        Assertions.assertEquals(other.id(), org2List.content().get(0).id());
    }

    @Test
    public void testNameRequired() {
        Assertions.assertThrows(Exception.class, () ->
                equipmentService.create(org1.getId(), new CreateEquipmentRequest(
                        "EQ-010", "   ", null, null, null, null, null, null, null, null)));
    }
}
