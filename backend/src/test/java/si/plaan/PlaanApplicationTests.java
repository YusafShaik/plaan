package si.plaan;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.request.CreateSupplierRequest;
import si.plaan.dto.request.CreateWarehouseRequest;
import si.plaan.dto.request.LoginRequest;
import si.plaan.dto.response.AuthResponse;
import si.plaan.dto.response.SupplierResponse;
import si.plaan.dto.response.WarehouseResponse;
import si.plaan.entity.Organization;
import si.plaan.repository.OrganizationRepository;
import si.plaan.service.AuthService;
import si.plaan.service.SupplierService;
import si.plaan.service.WarehouseService;

import java.util.UUID;

@SpringBootTest
@Transactional
class PlaanApplicationTests {

    @Autowired
    private AuthService authService;

    @Autowired
    private OrganizationRepository organizationRepository;

    @Autowired
    private WarehouseService warehouseService;

    @Autowired
    private SupplierService supplierService;

    @Test
    void contextLoads() {
        Assertions.assertNotNull(authService);
    }

    @Test
    void testPlatformAdminLogin() {
        AuthResponse response = authService.login(new LoginRequest("platform@plaan.io", "admin123"));
        Assertions.assertNotNull(response.accessToken());
        Assertions.assertEquals("platform@plaan.io", response.user().email());
    }

    @Test
    void testTenantDataIsolationAndCrossTenantCodes() {
        // Create Org A
        Organization orgA = organizationRepository.save(Organization.builder()
                .name("Tenant A Corp")
                .slug("tenant-a-" + UUID.randomUUID().toString().substring(0, 6))
                .country("USA")
                .baseCurrency("USD")
                .timeZone("UTC")
                .active(true)
                .build());

        // Create Org B
        Organization orgB = organizationRepository.save(Organization.builder()
                .name("Tenant B Corp")
                .slug("tenant-b-" + UUID.randomUUID().toString().substring(0, 6))
                .country("Germany")
                .baseCurrency("EUR")
                .timeZone("UTC")
                .active(true)
                .build());

        // Org A creates WH-100
        WarehouseResponse whA = warehouseService.createWarehouse(orgA.getId(),
                new CreateWarehouseRequest("WH-100", "Tenant A Depot", "Location A", "Desc", true));
        Assertions.assertNotNull(whA.id());
        Assertions.assertEquals("WH-100", whA.warehouseCode());

        // Org B can create identical WH-100 without constraint clash
        WarehouseResponse whB = warehouseService.createWarehouse(orgB.getId(),
                new CreateWarehouseRequest("WH-100", "Tenant B Depot", "Location B", "Desc", true));
        Assertions.assertNotNull(whB.id());
        Assertions.assertEquals("WH-100", whB.warehouseCode());
        Assertions.assertNotEquals(whA.id(), whB.id());

        // Org A cannot access Org B warehouse
        Assertions.assertThrows(Exception.class, () ->
                warehouseService.getWarehouseById(orgA.getId(), whB.id()));
    }

    @Test
    void testDuplicateCodeWithinSameOrganizationIsRejected() {
        Organization org = organizationRepository.save(Organization.builder()
                .name("Duplicate Test Org")
                .slug("dup-test-" + UUID.randomUUID().toString().substring(0, 6))
                .country("UK")
                .baseCurrency("GBP")
                .timeZone("UTC")
                .active(true)
                .build());

        supplierService.createSupplier(org.getId(),
                new CreateSupplierRequest("SUP-101", "Supplier 1", null, null, null, null, null, true));

        // Re-creating identical SUP-101 in same org must fail
        Assertions.assertThrows(IllegalArgumentException.class, () ->
                supplierService.createSupplier(org.getId(),
                        new CreateSupplierRequest("SUP-101", "Supplier 1 Duplicate", null, null, null, null, null, true)));
    }

    @Test
    void testNextCodeSequenceGeneration() {
        Organization org = organizationRepository.save(Organization.builder()
                .name("Seq Test Org")
                .slug("seq-test-" + UUID.randomUUID().toString().substring(0, 6))
                .country("Canada")
                .baseCurrency("CAD")
                .timeZone("UTC")
                .active(true)
                .build());

        String initialCode = warehouseService.getNextWarehouseCode(org.getId());
        Assertions.assertEquals("WH-001", initialCode);

        warehouseService.createWarehouse(org.getId(),
                new CreateWarehouseRequest(initialCode, "WH 1", null, null, true));

        String nextCode = warehouseService.getNextWarehouseCode(org.getId());
        Assertions.assertEquals("WH-002", nextCode);
    }
}
