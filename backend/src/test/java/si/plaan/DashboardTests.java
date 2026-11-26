package si.plaan;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.request.CreateEquipmentRequest;
import si.plaan.dto.response.DashboardOverviewResponse;
import si.plaan.dto.response.EquipmentResponse;
import si.plaan.entity.EquipmentOperationalStatus;
import si.plaan.entity.EquipmentRecordStatus;
import si.plaan.entity.Organization;
import si.plaan.repository.OrganizationRepository;
import si.plaan.service.DashboardService;
import si.plaan.service.EquipmentService;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.UUID;

@SpringBootTest
@Transactional
public class DashboardTests {

    @Autowired private DashboardService dashboardService;
    @Autowired private EquipmentService equipmentService;
    @Autowired private OrganizationRepository organizationRepository;

    private Organization org1;
    private Organization org2;
    private LocalDate today;

    @BeforeEach
    void setup() {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        org1 = organizationRepository.save(Organization.builder()
                .name("Dash Org " + uid).slug("dash-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());
        org2 = organizationRepository.save(Organization.builder()
                .name("Dash Other " + uid).slug("dash-o-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());
        today = LocalDate.now(ZoneId.of("Asia/Kolkata"));
    }

    @Test
    public void testEmptyOrganizationReturnsZeros() {
        DashboardOverviewResponse overview = dashboardService.getOverview(org1.getId());

        Assertions.assertEquals("INR", overview.currency());
        Assertions.assertEquals(today.withDayOfMonth(1), overview.periodFrom());
        Assertions.assertEquals(today, overview.periodTo());
        Assertions.assertEquals(0, BigDecimal.ZERO.compareTo(overview.metrics().salesInvoiced()));
        Assertions.assertEquals(0, BigDecimal.ZERO.compareTo(overview.metrics().purchasesInvoiced()));
        Assertions.assertEquals(0, BigDecimal.ZERO.compareTo(overview.metrics().customerOutstanding()));
        Assertions.assertEquals(0, BigDecimal.ZERO.compareTo(overview.metrics().supplierOutstanding()));
        Assertions.assertEquals(6, overview.trend().size());
        Assertions.assertEquals(YearMonth.from(today).minusMonths(5).toString(), overview.trend().get(0).monthKey());
        Assertions.assertEquals(YearMonth.from(today).toString(), overview.trend().get(5).monthKey());
        Assertions.assertEquals(0, overview.productionOrders().released());
        Assertions.assertEquals(0, overview.productionOrders().inProgress());
        Assertions.assertEquals(0, overview.productionOrders().completed());
        Assertions.assertEquals(0, overview.productionOrders().closed());
        Assertions.assertEquals(0, overview.equipmentStatus().activeMachines());
        Assertions.assertEquals(0, overview.attention().overduePurchaseOrders());
        Assertions.assertEquals(0, overview.attention().equipmentBreakdowns());
    }

    @Test
    public void testEquipmentStatusAndTenantIsolation() {
        equipmentService.create(org1.getId(), new CreateEquipmentRequest(
                "EQ-OP", "Press A", null, null, null, null,
                null, null, EquipmentOperationalStatus.OPERATIONAL, EquipmentRecordStatus.ACTIVE));
        equipmentService.create(org1.getId(), new CreateEquipmentRequest(
                "EQ-BD", "Press B", null, null, null, null,
                null, null, EquipmentOperationalStatus.BREAKDOWN, EquipmentRecordStatus.ACTIVE));
        equipmentService.create(org1.getId(), new CreateEquipmentRequest(
                "EQ-UM", "Press C", null, null, null, null,
                null, null, EquipmentOperationalStatus.UNDER_MAINTENANCE, EquipmentRecordStatus.ACTIVE));
        equipmentService.create(org1.getId(), new CreateEquipmentRequest(
                "EQ-IN", "Retired", null, null, null, null,
                null, null, EquipmentOperationalStatus.BREAKDOWN, EquipmentRecordStatus.INACTIVE));

        EquipmentResponse other = equipmentService.create(org2.getId(), new CreateEquipmentRequest(
                "EQ-X", "Other Press", null, null, null, null,
                null, null, EquipmentOperationalStatus.BREAKDOWN, EquipmentRecordStatus.ACTIVE));
        Assertions.assertNotNull(other.id());

        DashboardOverviewResponse overview = dashboardService.getOverview(org1.getId());
        Assertions.assertEquals(3, overview.equipmentStatus().activeMachines());
        Assertions.assertEquals(1, overview.equipmentStatus().operational());
        Assertions.assertEquals(1, overview.equipmentStatus().breakdown());
        Assertions.assertEquals(1, overview.equipmentStatus().underMaintenance());
        Assertions.assertEquals(1, overview.attention().equipmentBreakdowns());

        DashboardOverviewResponse otherOverview = dashboardService.getOverview(org2.getId());
        Assertions.assertEquals(1, otherOverview.equipmentStatus().activeMachines());
        Assertions.assertEquals(1, otherOverview.equipmentStatus().breakdown());
        Assertions.assertEquals(0, otherOverview.equipmentStatus().operational());
    }
}
