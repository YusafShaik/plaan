package si.plaan;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.request.CompleteMaintenanceWorkOrderRequest;
import si.plaan.dto.request.CreateEquipmentRequest;
import si.plaan.dto.request.CreateMaintenancePlanRequest;
import si.plaan.dto.request.CreateMaintenanceWorkOrderRequest;
import si.plaan.dto.request.StartMaintenanceWorkOrderRequest;
import si.plaan.dto.response.EquipmentMaintenanceHistoryItemResponse;
import si.plaan.dto.response.EquipmentResponse;
import si.plaan.dto.response.MaintenancePlanResponse;
import si.plaan.dto.response.MaintenanceWorkOrderResponse;
import si.plaan.dto.response.MaintenanceWorkOrderSummaryResponse;
import si.plaan.entity.*;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.OrganizationRepository;
import si.plaan.service.EquipmentService;
import si.plaan.service.MaintenancePlanService;
import si.plaan.service.MaintenanceWorkOrderService;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@SpringBootTest
@Transactional
public class MaintenanceWorkOrderTests {

    @Autowired private MaintenanceWorkOrderService workOrderService;
    @Autowired private MaintenancePlanService maintenancePlanService;
    @Autowired private EquipmentService equipmentService;
    @Autowired private OrganizationRepository organizationRepository;

    private Organization org1;
    private Organization org2;
    private EquipmentResponse cuttingMachine;
    private EquipmentResponse drillingMachine;
    private MaintenancePlanResponse lubricationPlan;

    @BeforeEach
    public void setup() {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        org1 = organizationRepository.save(Organization.builder()
                .name("MWO Org " + uid).slug("mwo-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());
        org2 = organizationRepository.save(Organization.builder()
                .name("MWO Other " + uid).slug("mwo-o-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());

        cuttingMachine = equipmentService.create(org1.getId(), new CreateEquipmentRequest(
                "EQ-001", "Wood Cutting Machine", null, null, null, "Cutting Area",
                null, null, EquipmentOperationalStatus.OPERATIONAL, EquipmentRecordStatus.ACTIVE));
        drillingMachine = equipmentService.create(org1.getId(), new CreateEquipmentRequest(
                "EQ-002", "Drilling Machine", null, null, null, "Assembly Area",
                null, null, EquipmentOperationalStatus.OPERATIONAL, EquipmentRecordStatus.ACTIVE));

        lubricationPlan = maintenancePlanService.create(org1.getId(), new CreateMaintenancePlanRequest(
                null, "Lubrication", cuttingMachine.id(), 30, LocalDate.of(2026, 12, 1),
                "1. Clean\n2. Lubricate", null, MaintenancePlanStatus.ACTIVE));
    }

    @Test
    public void testPreventiveLifecycleAndPlanReschedule() {
        MaintenanceWorkOrderResponse created = workOrderService.create(org1.getId(),
                new CreateMaintenanceWorkOrderRequest(
                        null, LocalDate.of(2026, 11, 26), MaintenanceWorkOrderType.PREVENTIVE,
                        cuttingMachine.id(), lubricationPlan.id(), MaintenanceWorkOrderPriority.MEDIUM,
                        "Ravi", null, null, null, null));
        Assertions.assertTrue(created.workOrderNumber().startsWith("MWO-"));
        Assertions.assertEquals(MaintenanceWorkOrderStatus.OPEN, created.status());
        Assertions.assertEquals("Lubrication", created.activityName());
        Assertions.assertNotNull(created.instructions());

        // Duplicate open/in-progress against same plan blocked
        Assertions.assertThrows(IllegalStateException.class, () ->
                workOrderService.create(org1.getId(), new CreateMaintenanceWorkOrderRequest(
                        null, LocalDate.now(), MaintenanceWorkOrderType.PREVENTIVE,
                        cuttingMachine.id(), lubricationPlan.id(), null, null, null, null, null, null)));

        MaintenanceWorkOrderResponse started = workOrderService.start(org1.getId(), created.id(),
                new StartMaintenanceWorkOrderRequest(LocalDate.of(2026, 12, 3), LocalTime.of(10, 0)));
        Assertions.assertEquals(MaintenanceWorkOrderStatus.IN_PROGRESS, started.status());
        Assertions.assertEquals(EquipmentOperationalStatus.UNDER_MAINTENANCE,
                equipmentService.getById(org1.getId(), cuttingMachine.id()).operationalStatus());

        MaintenanceWorkOrderResponse completed = workOrderService.complete(org1.getId(), created.id(),
                new CompleteMaintenanceWorkOrderRequest(
                        "Lubricated moving parts",
                        LocalDate.of(2026, 12, 3),
                        LocalTime.of(11, 0),
                        true,
                        null));
        Assertions.assertEquals(MaintenanceWorkOrderStatus.COMPLETED, completed.status());
        Assertions.assertEquals(60, completed.durationMinutes());
        Assertions.assertEquals(EquipmentOperationalStatus.OPERATIONAL,
                equipmentService.getById(org1.getId(), cuttingMachine.id()).operationalStatus());

        MaintenancePlanResponse plan = maintenancePlanService.getById(org1.getId(), lubricationPlan.id());
        Assertions.assertEquals(LocalDate.of(2026, 12, 3), plan.lastCompletedDate());
        Assertions.assertEquals(LocalDate.of(2027, 1, 2), plan.nextDueDate());

        List<EquipmentMaintenanceHistoryItemResponse> history =
                workOrderService.getHistoryByEquipment(org1.getId(), cuttingMachine.id());
        Assertions.assertEquals(1, history.size());
        Assertions.assertEquals(completed.id(), history.get(0).workOrderId());
        Assertions.assertEquals(MaintenanceWorkOrderType.PREVENTIVE, history.get(0).type());
    }

    @Test
    public void testBreakdownDowntimeAndCancel() {
        MaintenanceWorkOrderResponse created = workOrderService.create(org1.getId(),
                new CreateMaintenanceWorkOrderRequest(
                        null, LocalDate.of(2026, 11, 26), MaintenanceWorkOrderType.BREAKDOWN,
                        drillingMachine.id(), null, MaintenanceWorkOrderPriority.HIGH,
                        "Asha", "Motor stopped working during production.", "urgent",
                        LocalDate.of(2026, 11, 26), LocalTime.of(10, 0)));
        Assertions.assertEquals(MaintenanceWorkOrderStatus.OPEN, created.status());
        Assertions.assertEquals(EquipmentOperationalStatus.BREAKDOWN,
                equipmentService.getById(org1.getId(), drillingMachine.id()).operationalStatus());

        workOrderService.start(org1.getId(), created.id(),
                new StartMaintenanceWorkOrderRequest(LocalDate.of(2026, 11, 26), LocalTime.of(10, 30)));

        MaintenanceWorkOrderResponse completed = workOrderService.complete(org1.getId(), created.id(),
                new CompleteMaintenanceWorkOrderRequest(
                        "Replaced faulty motor and tested machine operation.",
                        LocalDate.of(2026, 11, 26),
                        LocalTime.of(14, 0),
                        true,
                        null));
        Assertions.assertEquals(240, completed.downtimeMinutes()); // 10:00 → 14:00
        Assertions.assertEquals(210, completed.durationMinutes()); // 10:30 → 14:00
        Assertions.assertEquals(EquipmentOperationalStatus.OPERATIONAL,
                equipmentService.getById(org1.getId(), drillingMachine.id()).operationalStatus());

        // Cancel path: open breakdown then cancel restores operational
        MaintenanceWorkOrderResponse openBd = workOrderService.create(org1.getId(),
                new CreateMaintenanceWorkOrderRequest(
                        null, LocalDate.now(), MaintenanceWorkOrderType.BREAKDOWN,
                        drillingMachine.id(), null, null, null, "Belt snapped", null,
                        LocalDate.now(), LocalTime.of(9, 0)));
        Assertions.assertEquals(EquipmentOperationalStatus.BREAKDOWN,
                equipmentService.getById(org1.getId(), drillingMachine.id()).operationalStatus());
        workOrderService.cancel(org1.getId(), openBd.id());
        Assertions.assertEquals(EquipmentOperationalStatus.OPERATIONAL,
                equipmentService.getById(org1.getId(), drillingMachine.id()).operationalStatus());
    }

    @Test
    public void testUnsuccessfulPreventiveDoesNotAdvancePlan() {
        MaintenanceWorkOrderResponse created = workOrderService.create(org1.getId(),
                new CreateMaintenanceWorkOrderRequest(
                        null, LocalDate.now(), MaintenanceWorkOrderType.PREVENTIVE,
                        cuttingMachine.id(), lubricationPlan.id(), null, null, null, null, null, null));
        workOrderService.start(org1.getId(), created.id(), null);
        workOrderService.complete(org1.getId(), created.id(),
                new CompleteMaintenanceWorkOrderRequest(
                        "Could not finish — parts unavailable",
                        LocalDate.now(), LocalTime.now(), false, "Need spare parts"));

        MaintenancePlanResponse plan = maintenancePlanService.getById(org1.getId(), lubricationPlan.id());
        Assertions.assertEquals(LocalDate.of(2026, 12, 1), plan.nextDueDate());
        Assertions.assertNull(plan.lastCompletedDate());
        Assertions.assertEquals(EquipmentOperationalStatus.BREAKDOWN,
                equipmentService.getById(org1.getId(), cuttingMachine.id()).operationalStatus());
    }

    @Test
    public void testOneInProgressPerEquipmentAndDeactivateBlocked() {
        MaintenanceWorkOrderResponse first = workOrderService.create(org1.getId(),
                new CreateMaintenanceWorkOrderRequest(
                        null, LocalDate.now(), MaintenanceWorkOrderType.PREVENTIVE,
                        cuttingMachine.id(), lubricationPlan.id(), null, null, null, null, null, null));
        workOrderService.start(org1.getId(), first.id(), null);

        MaintenanceWorkOrderResponse breakdown = workOrderService.create(org1.getId(),
                new CreateMaintenanceWorkOrderRequest(
                        null, LocalDate.now(), MaintenanceWorkOrderType.BREAKDOWN,
                        cuttingMachine.id(), null, null, null, "Unexpected noise", null,
                        LocalDate.now(), LocalTime.NOON));
        Assertions.assertThrows(IllegalStateException.class, () ->
                workOrderService.start(org1.getId(), breakdown.id(), null));

        Assertions.assertThrows(IllegalStateException.class, () ->
                equipmentService.deactivate(org1.getId(), cuttingMachine.id()));
    }

    @Test
    public void testTenantIsolationAndSummary() {
        workOrderService.create(org1.getId(), new CreateMaintenanceWorkOrderRequest(
                null, LocalDate.now(), MaintenanceWorkOrderType.BREAKDOWN,
                drillingMachine.id(), null, null, null, "Sensor fault", null,
                LocalDate.now(), LocalTime.of(8, 0)));

        MaintenanceWorkOrderSummaryResponse summary = workOrderService.getSummary(org1.getId());
        Assertions.assertEquals(1, summary.openCount());

        Assertions.assertEquals(0, workOrderService.getSummary(org2.getId()).openCount());
        Assertions.assertThrows(ResourceNotFoundException.class, () ->
                workOrderService.getById(org2.getId(),
                        workOrderService.getWorkOrders(org1.getId(), null, null, null, null,
                                PageRequest.of(0, 10)).content().get(0).id()));
    }
}
