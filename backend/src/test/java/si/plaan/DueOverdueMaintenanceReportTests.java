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
import si.plaan.dto.response.DueOverdueMaintenanceReportResponse;
import si.plaan.dto.response.DueOverdueMaintenanceRowResponse;
import si.plaan.dto.response.EquipmentResponse;
import si.plaan.dto.response.MaintenancePlanResponse;
import si.plaan.dto.response.MaintenanceWorkOrderResponse;
import si.plaan.entity.*;
import si.plaan.repository.OrganizationRepository;
import si.plaan.service.DueOverdueMaintenanceReportService;
import si.plaan.service.EquipmentService;
import si.plaan.service.MaintenancePlanService;
import si.plaan.service.MaintenanceWorkOrderService;
import si.plaan.service.impl.DueOverdueMaintenanceReportServiceImpl;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@SpringBootTest
@Transactional
public class DueOverdueMaintenanceReportTests {

    @Autowired private DueOverdueMaintenanceReportService reportService;
    @Autowired private MaintenancePlanService maintenancePlanService;
    @Autowired private MaintenanceWorkOrderService workOrderService;
    @Autowired private EquipmentService equipmentService;
    @Autowired private OrganizationRepository organizationRepository;

    private Organization org1;
    private Organization org2;
    private EquipmentResponse cnc;
    private EquipmentResponse press;
    private EquipmentResponse compressor;
    private EquipmentResponse conveyor;
    private LocalDate today;

    @BeforeEach
    void setup() {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        org1 = organizationRepository.save(Organization.builder()
                .name("DO Org " + uid).slug("do-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());
        org2 = organizationRepository.save(Organization.builder()
                .name("DO Other " + uid).slug("do-o-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());

        today = LocalDate.now(java.time.ZoneId.of("Asia/Kolkata"));

        cnc = equipmentService.create(org1.getId(), new CreateEquipmentRequest(
                "EQ-CNC", "CNC Machine 01", null, null, null, "Floor",
                null, null, EquipmentOperationalStatus.OPERATIONAL, EquipmentRecordStatus.ACTIVE));
        press = equipmentService.create(org1.getId(), new CreateEquipmentRequest(
                "EQ-PRS", "Hydraulic Press 01", null, null, null, "Floor",
                null, null, EquipmentOperationalStatus.OPERATIONAL, EquipmentRecordStatus.ACTIVE));
        compressor = equipmentService.create(org1.getId(), new CreateEquipmentRequest(
                "EQ-AIR", "Air Compressor 01", null, null, null, "Utility",
                null, null, EquipmentOperationalStatus.BREAKDOWN, EquipmentRecordStatus.ACTIVE));
        conveyor = equipmentService.create(org1.getId(), new CreateEquipmentRequest(
                "EQ-CNV", "Conveyor 01", null, null, null, "Line",
                null, null, EquipmentOperationalStatus.OPERATIONAL, EquipmentRecordStatus.ACTIVE));
    }

    private MaintenancePlanResponse plan(
            EquipmentResponse equipment, String name, int frequency, LocalDate firstDue) {
        return maintenancePlanService.create(org1.getId(), new CreateMaintenancePlanRequest(
                null, name, equipment.id(), frequency, firstDue,
                "Do maintenance", null, MaintenancePlanStatus.ACTIVE));
    }

    @Test
    public void testDueStatusesLinkedWorkOrdersFiltersAndIsolation() {
        MaintenancePlanResponse overdueWithWo = plan(cnc, "Lubrication", 30, today.minusDays(3));
        MaintenancePlanResponse overdueNoWo = plan(press, "Hydraulic oil check", 45, today.minusDays(1));
        MaintenancePlanResponse dueToday = plan(compressor, "Filter cleaning", 60, today);
        MaintenancePlanResponse upcoming1 = plan(cnc, "Monthly servicing", 30, today.plusDays(4));
        MaintenancePlanResponse upcoming2 = plan(conveyor, "Belt inspection", 90, today.plusDays(6));

        // Inactive plan excluded
        MaintenancePlanResponse inactive = plan(press, "Retired check", 30, today.minusDays(10));
        maintenancePlanService.deactivate(org1.getId(), inactive.id());

        // Inactive equipment plan excluded
        EquipmentResponse inactiveEq = equipmentService.create(org1.getId(), new CreateEquipmentRequest(
                "EQ-OLD", "Retired Machine", null, null, null, null,
                null, null, EquipmentOperationalStatus.OPERATIONAL, EquipmentRecordStatus.INACTIVE));
        Assertions.assertThrows(IllegalArgumentException.class, () ->
                plan(inactiveEq, "Should fail", 30, today));

        // Open WO against overdue plan
        MaintenanceWorkOrderResponse openWo = workOrderService.create(org1.getId(),
                new CreateMaintenanceWorkOrderRequest(
                        null, today, MaintenanceWorkOrderType.PREVENTIVE,
                        cnc.id(), overdueWithWo.id(), MaintenanceWorkOrderPriority.MEDIUM,
                        "Ravi", null, null, null, null));

        DueOverdueMaintenanceReportResponse report = reportService.getReport(
                org1.getId(), null, null, null, null, null, PageRequest.of(0, 50));

        Assertions.assertEquals(5, report.summary().maintenancePlans());
        Assertions.assertEquals(2, report.summary().overdue());
        Assertions.assertEquals(1, report.summary().dueToday());
        Assertions.assertEquals(2, report.summary().upcoming());
        Assertions.assertEquals(MaintenanceScheduleStatus.OVERDUE, report.plans().content().get(0).dueStatus());

        DueOverdueMaintenanceRowResponse linked = report.plans().content().stream()
                .filter(r -> r.maintenancePlanId().equals(overdueWithWo.id()))
                .findFirst()
                .orElseThrow();
        Assertions.assertEquals(3, linked.daysOverdue());
        Assertions.assertEquals(openWo.id(), linked.workOrderId());
        Assertions.assertEquals(openWo.workOrderNumber(), linked.workOrderNumber());
        Assertions.assertEquals(MaintenanceWorkOrderStatus.OPEN, linked.workOrderStatus());

        DueOverdueMaintenanceRowResponse notCreated = report.plans().content().stream()
                .filter(r -> r.maintenancePlanId().equals(overdueNoWo.id()))
                .findFirst()
                .orElseThrow();
        Assertions.assertNull(notCreated.workOrderId());
        Assertions.assertEquals(1, notCreated.daysOverdue());

        DueOverdueMaintenanceReportResponse overdueOnly = reportService.getReport(
                org1.getId(), null, MaintenanceScheduleStatus.OVERDUE, null, null, null,
                PageRequest.of(0, 20));
        Assertions.assertEquals(2, overdueOnly.summary().maintenancePlans());

        DueOverdueMaintenanceReportResponse notCreatedOnly = reportService.getReport(
                org1.getId(), null, null, null, null,
                DueOverdueMaintenanceReportServiceImpl.WO_NOT_CREATED, PageRequest.of(0, 20));
        Assertions.assertEquals(4, notCreatedOnly.summary().maintenancePlans());
        Assertions.assertTrue(notCreatedOnly.plans().content().stream()
                .allMatch(r -> r.workOrderId() == null));

        DueOverdueMaintenanceReportResponse openOnly = reportService.getReport(
                org1.getId(), null, null, null, null,
                DueOverdueMaintenanceReportServiceImpl.WO_OPEN, PageRequest.of(0, 20));
        Assertions.assertEquals(1, openOnly.summary().maintenancePlans());
        Assertions.assertEquals(overdueWithWo.id(), openOnly.plans().content().get(0).maintenancePlanId());

        DueOverdueMaintenanceReportResponse cncOnly = reportService.getReport(
                org1.getId(), cnc.id(), null, null, null, null, PageRequest.of(0, 20));
        Assertions.assertEquals(2, cncOnly.summary().maintenancePlans());

        // Successful completion advances schedule → overdueWithWo leaves overdue set
        workOrderService.start(org1.getId(), openWo.id(),
                new StartMaintenanceWorkOrderRequest(today, LocalTime.of(9, 0)));
        workOrderService.complete(org1.getId(), openWo.id(),
                new CompleteMaintenanceWorkOrderRequest(
                        "Lubricated", today, LocalTime.of(10, 0), true, null));
        MaintenancePlanResponse advanced = maintenancePlanService.getById(org1.getId(), overdueWithWo.id());
        Assertions.assertEquals(today.plusDays(30), advanced.nextDueDate());

        DueOverdueMaintenanceReportResponse afterSuccess = reportService.getReport(
                org1.getId(), null, null, null, null, null, PageRequest.of(0, 50));
        Assertions.assertEquals(1, afterSuccess.summary().overdue());
        Assertions.assertTrue(afterSuccess.plans().content().stream()
                .anyMatch(r -> r.maintenancePlanId().equals(overdueWithWo.id())
                        && r.dueStatus() == MaintenanceScheduleStatus.UPCOMING));

        // Unsuccessful completion does not advance
        MaintenanceWorkOrderResponse badWo = workOrderService.create(org1.getId(),
                new CreateMaintenanceWorkOrderRequest(
                        null, today, MaintenanceWorkOrderType.PREVENTIVE,
                        press.id(), overdueNoWo.id(), null, "Asha", null, null, null, null));
        workOrderService.start(org1.getId(), badWo.id(),
                new StartMaintenanceWorkOrderRequest(today, LocalTime.of(11, 0)));
        workOrderService.complete(org1.getId(), badWo.id(),
                new CompleteMaintenanceWorkOrderRequest(
                        "Could not finish", today, LocalTime.of(12, 0), false, "Awaiting parts"));
        MaintenancePlanResponse stillOverdue = maintenancePlanService.getById(org1.getId(), overdueNoWo.id());
        Assertions.assertEquals(today.minusDays(1), stillOverdue.nextDueDate());

        byte[] csv = reportService.exportCsv(org1.getId(), null, null, null, null, null);
        String text = new String(csv, StandardCharsets.UTF_8);
        Assertions.assertTrue(text.contains("Hydraulic oil check"));
        Assertions.assertTrue(text.contains("OVERDUE"));
        Assertions.assertTrue(text.contains("Not Created") || text.contains("Belt inspection"));

        DueOverdueMaintenanceReportResponse other = reportService.getReport(
                org2.getId(), null, null, null, null, null, PageRequest.of(0, 10));
        Assertions.assertEquals(0, other.summary().maintenancePlans());
    }
}
