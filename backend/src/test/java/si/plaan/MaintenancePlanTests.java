package si.plaan;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.request.CreateEquipmentRequest;
import si.plaan.dto.request.CreateMaintenancePlanRequest;
import si.plaan.dto.request.UpdateMaintenancePlanRequest;
import si.plaan.dto.response.EquipmentResponse;
import si.plaan.dto.response.MaintenancePlanResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.entity.*;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.OrganizationRepository;
import si.plaan.service.EquipmentService;
import si.plaan.service.MaintenancePlanService;
import si.plaan.service.impl.MaintenancePlanServiceImpl;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@SpringBootTest
@Transactional
public class MaintenancePlanTests {

    @Autowired private MaintenancePlanService maintenancePlanService;
    @Autowired private EquipmentService equipmentService;
    @Autowired private OrganizationRepository organizationRepository;

    private Organization org1;
    private Organization org2;
    private EquipmentResponse cuttingMachine;
    private EquipmentResponse drillingMachine;
    private EquipmentResponse inactiveMachine;

    @BeforeEach
    public void setup() {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        org1 = organizationRepository.save(Organization.builder()
                .name("MP Org " + uid).slug("mp-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());
        org2 = organizationRepository.save(Organization.builder()
                .name("MP Other " + uid).slug("mp-o-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());

        cuttingMachine = equipmentService.create(org1.getId(), new CreateEquipmentRequest(
                "EQ-001", "Wood Cutting Machine", null, null, null, "Cutting Area",
                null, null, EquipmentOperationalStatus.OPERATIONAL, EquipmentRecordStatus.ACTIVE));
        drillingMachine = equipmentService.create(org1.getId(), new CreateEquipmentRequest(
                "EQ-002", "Drilling Machine", null, null, null, "Assembly Area",
                null, null, EquipmentOperationalStatus.OPERATIONAL, EquipmentRecordStatus.ACTIVE));
        inactiveMachine = equipmentService.create(org1.getId(), new CreateEquipmentRequest(
                "EQ-003", "Retired Press", null, null, null, null,
                null, null, EquipmentOperationalStatus.OPERATIONAL, EquipmentRecordStatus.INACTIVE));
    }

    @Test
    public void testCreateMultiplePlansAndScheduleStatus() {
        LocalDate overdue = LocalDate.now().minusDays(2);
        LocalDate today = LocalDate.now();
        LocalDate upcoming = LocalDate.now().plusDays(10);

        MaintenancePlanResponse lube = maintenancePlanService.create(org1.getId(),
                new CreateMaintenancePlanRequest(
                        null, "Lubrication", cuttingMachine.id(), 15, overdue,
                        "1. Clean\n2. Lubricate", null, MaintenancePlanStatus.ACTIVE));
        Assertions.assertTrue(lube.planNumber().startsWith("MP-"));
        Assertions.assertEquals(overdue, lube.nextDueDate());
        Assertions.assertEquals(MaintenanceScheduleStatus.OVERDUE, lube.scheduleStatus());

        MaintenancePlanResponse blade = maintenancePlanService.create(org1.getId(),
                new CreateMaintenancePlanRequest(
                        null, "Blade Inspection", cuttingMachine.id(), 30, today,
                        "Inspect blades", null, null));
        Assertions.assertEquals(MaintenanceScheduleStatus.DUE_TODAY, blade.scheduleStatus());

        MaintenancePlanResponse motor = maintenancePlanService.create(org1.getId(),
                new CreateMaintenancePlanRequest(
                        null, "Motor Inspection", drillingMachine.id(), 90, upcoming,
                        "Inspect motor", "optional note", MaintenancePlanStatus.ACTIVE));
        Assertions.assertEquals(MaintenanceScheduleStatus.UPCOMING, motor.scheduleStatus());

        List<MaintenancePlanResponse> forCutting =
                maintenancePlanService.getPlansByEquipment(org1.getId(), cuttingMachine.id());
        Assertions.assertEquals(2, forCutting.size());

        PageResponse<MaintenancePlanResponse> overduePage = maintenancePlanService.getPlans(
                org1.getId(), null, MaintenancePlanStatus.ACTIVE,
                MaintenanceScheduleStatus.OVERDUE, null, PageRequest.of(0, 10));
        Assertions.assertEquals(1, overduePage.totalElements());
        Assertions.assertEquals(lube.id(), overduePage.content().get(0).id());
    }

    @Test
    public void testInactiveEquipmentRejectedAndDueDoesNotAutoAdvance() {
        Assertions.assertThrows(IllegalArgumentException.class, () ->
                maintenancePlanService.create(org1.getId(), new CreateMaintenancePlanRequest(
                        null, "Bad Plan", inactiveMachine.id(), 30, LocalDate.now(),
                        "Do something", null, null)));

        LocalDate due = LocalDate.now().minusDays(5);
        MaintenancePlanResponse plan = maintenancePlanService.create(org1.getId(),
                new CreateMaintenancePlanRequest(
                        null, "Lubrication", cuttingMachine.id(), 15, due,
                        "Lubricate", null, MaintenancePlanStatus.ACTIVE));
        Assertions.assertEquals(due, plan.nextDueDate());
        Assertions.assertEquals(MaintenanceScheduleStatus.OVERDUE, plan.scheduleStatus());

        // Passing due date must not auto-advance — reload still same next due
        MaintenancePlanResponse reloaded = maintenancePlanService.getById(org1.getId(), plan.id());
        Assertions.assertEquals(due, reloaded.nextDueDate());
    }

    @Test
    public void testEditActivateDeactivateAndTenantIsolation() {
        MaintenancePlanResponse plan = maintenancePlanService.create(org1.getId(),
                new CreateMaintenancePlanRequest(
                        null, "Lubrication", cuttingMachine.id(), 15, LocalDate.now().plusDays(5),
                        "Lubricate", null, MaintenancePlanStatus.ACTIVE));

        LocalDate newFirst = LocalDate.now().plusDays(20);
        MaintenancePlanResponse updated = maintenancePlanService.update(org1.getId(), plan.id(),
                new UpdateMaintenancePlanRequest(
                        "Routine Lubrication", cuttingMachine.id(), 30, newFirst,
                        "1. Clean\n2. Lubricate", "Updated", MaintenancePlanStatus.ACTIVE));
        Assertions.assertEquals("Routine Lubrication", updated.planName());
        Assertions.assertEquals(30, updated.frequencyDays());
        Assertions.assertEquals(newFirst, updated.nextDueDate());

        MaintenancePlanResponse inactive = maintenancePlanService.deactivate(org1.getId(), plan.id());
        Assertions.assertEquals(MaintenancePlanStatus.INACTIVE, inactive.status());

        Assertions.assertThrows(ResourceNotFoundException.class, () ->
                maintenancePlanService.getById(org2.getId(), plan.id()));

        PageResponse<MaintenancePlanResponse> org2List = maintenancePlanService.getPlans(
                org2.getId(), null, null, null, null, PageRequest.of(0, 10));
        Assertions.assertEquals(0, org2List.totalElements());
    }

    @Test
    public void testResolveScheduleStatusHelper() {
        LocalDate today = LocalDate.of(2026, 11, 26);
        Assertions.assertEquals(MaintenanceScheduleStatus.OVERDUE,
                MaintenancePlanServiceImpl.resolveScheduleStatus(today.minusDays(1), today));
        Assertions.assertEquals(MaintenanceScheduleStatus.DUE_TODAY,
                MaintenancePlanServiceImpl.resolveScheduleStatus(today, today));
        Assertions.assertEquals(MaintenanceScheduleStatus.UPCOMING,
                MaintenancePlanServiceImpl.resolveScheduleStatus(today.plusDays(1), today));
    }
}
