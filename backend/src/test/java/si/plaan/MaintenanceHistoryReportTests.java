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
import si.plaan.dto.response.EquipmentResponse;
import si.plaan.dto.response.MaintenanceHistoryReportResponse;
import si.plaan.dto.response.MaintenanceHistoryRowResponse;
import si.plaan.dto.response.MaintenancePlanResponse;
import si.plaan.dto.response.MaintenanceWorkOrderResponse;
import si.plaan.entity.*;
import si.plaan.repository.OrganizationRepository;
import si.plaan.service.EquipmentService;
import si.plaan.service.MaintenanceHistoryReportService;
import si.plaan.service.MaintenancePlanService;
import si.plaan.service.MaintenanceWorkOrderService;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@SpringBootTest
@Transactional
public class MaintenanceHistoryReportTests {

    @Autowired private MaintenanceHistoryReportService reportService;
    @Autowired private MaintenanceWorkOrderService workOrderService;
    @Autowired private MaintenancePlanService maintenancePlanService;
    @Autowired private EquipmentService equipmentService;
    @Autowired private OrganizationRepository organizationRepository;

    private Organization org1;
    private Organization org2;
    private EquipmentResponse cnc;
    private EquipmentResponse press;
    private EquipmentResponse compressor;
    private MaintenancePlanResponse cncPlan;
    private MaintenancePlanResponse compressorPlan;
    private LocalDate today;
    private LocalDate from;

    @BeforeEach
    void setup() {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        org1 = organizationRepository.save(Organization.builder()
                .name("MH Org " + uid).slug("mh-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());
        org2 = organizationRepository.save(Organization.builder()
                .name("MH Other " + uid).slug("mh-o-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());

        today = LocalDate.now(java.time.ZoneId.of("Asia/Kolkata"));
        from = today.withDayOfMonth(1);

        cnc = equipmentService.create(org1.getId(), new CreateEquipmentRequest(
                "EQ-CNC", "CNC Machine 01", null, null, null, "Shop Floor",
                null, null, EquipmentOperationalStatus.OPERATIONAL, EquipmentRecordStatus.ACTIVE));
        press = equipmentService.create(org1.getId(), new CreateEquipmentRequest(
                "EQ-PRS", "Hydraulic Press 01", null, null, null, "Shop Floor",
                null, null, EquipmentOperationalStatus.OPERATIONAL, EquipmentRecordStatus.ACTIVE));
        compressor = equipmentService.create(org1.getId(), new CreateEquipmentRequest(
                "EQ-AIR", "Air Compressor 01", null, null, null, "Utility",
                null, null, EquipmentOperationalStatus.OPERATIONAL, EquipmentRecordStatus.ACTIVE));

        cncPlan = maintenancePlanService.create(org1.getId(), new CreateMaintenancePlanRequest(
                null, "CNC Lubrication", cnc.id(), 30, from.plusDays(20),
                "Lubricate axes", null, MaintenancePlanStatus.ACTIVE));
        compressorPlan = maintenancePlanService.create(org1.getId(), new CreateMaintenancePlanRequest(
                null, "Compressor Filter Check", compressor.id(), 60, from.plusDays(25),
                "Check filters", null, MaintenancePlanStatus.ACTIVE));
    }

    private MaintenanceWorkOrderResponse completePreventive(
            EquipmentResponse equipment,
            Long planId,
            String technician,
            LocalDate day,
            LocalTime start,
            LocalTime end,
            boolean operational) {
        MaintenanceWorkOrderResponse created = workOrderService.create(org1.getId(),
                new CreateMaintenanceWorkOrderRequest(
                        null, day, MaintenanceWorkOrderType.PREVENTIVE,
                        equipment.id(), planId, MaintenanceWorkOrderPriority.MEDIUM,
                        technician, null, null, null, null));
        workOrderService.start(org1.getId(), created.id(),
                new StartMaintenanceWorkOrderRequest(day, start));
        return workOrderService.complete(org1.getId(), created.id(),
                new CompleteMaintenanceWorkOrderRequest(
                        "Completed preventive work", day, end, operational, null));
    }

    private MaintenanceWorkOrderResponse completeBreakdown(
            EquipmentResponse equipment,
            String technician,
            LocalDate day,
            LocalTime breakdown,
            LocalTime start,
            LocalTime end,
            boolean operational,
            String remarks) {
        MaintenanceWorkOrderResponse created = workOrderService.create(org1.getId(),
                new CreateMaintenanceWorkOrderRequest(
                        null, day, MaintenanceWorkOrderType.BREAKDOWN,
                        equipment.id(), null, MaintenanceWorkOrderPriority.HIGH,
                        technician, "Machine stopped", null, day, breakdown));
        workOrderService.start(org1.getId(), created.id(),
                new StartMaintenanceWorkOrderRequest(day, start));
        return workOrderService.complete(org1.getId(), created.id(),
                new CompleteMaintenanceWorkOrderRequest(
                        "Completed breakdown repair", day, end, operational, remarks));
    }

    @Test
    public void testHistorySummaryBreakdownFiltersAndIsolation() {
        // MWO-1 CNC preventive 2 hrs
        MaintenanceWorkOrderResponse mwo1 = completePreventive(
                cnc, cncPlan.id(), "Ravi", from.plusDays(4),
                LocalTime.of(9, 0), LocalTime.of(11, 0), true);

        // MWO-2 Press breakdown 5 hrs (start 10 → end 15), operational
        MaintenanceWorkOrderResponse mwo2 = completeBreakdown(
                press, "Asha", from.plusDays(9),
                LocalTime.of(9, 0), LocalTime.of(10, 0), LocalTime.of(15, 0), true, null);

        // Need another plan for second preventive on CNC? Same plan can't have open WO but completed is ok.
        // After first completion plan reschedules - can create another preventive against same plan.
        MaintenanceWorkOrderResponse mwo3 = completeBreakdown(
                cnc, "Ravi", from.plusDays(14),
                LocalTime.of(8, 0), LocalTime.of(9, 0), LocalTime.of(12, 0), true, null);

        MaintenanceWorkOrderResponse mwo4 = completePreventive(
                compressor, compressorPlan.id(), "Ravi", from.plusDays(19),
                LocalTime.of(10, 0), LocalTime.of(11, 30), true);

        MaintenanceWorkOrderResponse mwo5 = completeBreakdown(
                press, "Asha", from.plusDays(23),
                LocalTime.of(9, 0), LocalTime.of(10, 0), LocalTime.of(14, 0), false, "Awaiting spare");

        // Open WO excluded
        workOrderService.create(org1.getId(), new CreateMaintenanceWorkOrderRequest(
                null, today, MaintenanceWorkOrderType.BREAKDOWN,
                compressor.id(), null, null, "Temp", "Noise", null, today, LocalTime.of(8, 0)));

        // Outside range excluded
        completeBreakdown(
                press, "Asha", from.minusMonths(1).withDayOfMonth(15),
                LocalTime.of(9, 0), LocalTime.of(10, 0), LocalTime.of(12, 0), true, null);

        MaintenanceHistoryReportResponse report = reportService.getReport(
                org1.getId(), from, today, null, null, null, null, PageRequest.of(0, 50));

        Assertions.assertEquals(5, report.summary().completedWorkOrders());
        Assertions.assertEquals(2, report.summary().preventiveMaintenance());
        Assertions.assertEquals(3, report.summary().breakdownWorkOrders());
        // 120 + 300 + 180 + 90 + 240 = 930 minutes = 15.5 hrs
        Assertions.assertEquals(930, report.summary().totalDurationMinutes());
        Assertions.assertEquals(3, report.byEquipment().size());
        Assertions.assertEquals(2, report.byEquipment().get(0).totalWorkOrders());
        Assertions.assertTrue(report.technicians().contains("Ravi"));
        Assertions.assertTrue(report.technicians().contains("Asha"));

        MaintenanceHistoryRowResponse row1 = report.workOrders().content().stream()
                .filter(r -> r.workOrderId().equals(mwo1.id()))
                .findFirst()
                .orElseThrow();
        Assertions.assertEquals(MaintenanceWorkOrderType.PREVENTIVE, row1.maintenanceType());
        Assertions.assertEquals(120, row1.durationMinutes());
        Assertions.assertEquals(Boolean.TRUE, row1.machineOperational());
        Assertions.assertEquals("CNC Lubrication", row1.maintenancePlanName());

        MaintenanceHistoryRowResponse notRestored = report.workOrders().content().stream()
                .filter(r -> r.workOrderId().equals(mwo5.id()))
                .findFirst()
                .orElseThrow();
        Assertions.assertEquals(Boolean.FALSE, notRestored.machineOperational());
        Assertions.assertEquals(240, notRestored.durationMinutes());

        // Newest completion first
        Assertions.assertEquals(mwo5.id(), report.workOrders().content().get(0).workOrderId());

        MaintenanceHistoryReportResponse preventiveOnly = reportService.getReport(
                org1.getId(), from, today, null, MaintenanceWorkOrderType.PREVENTIVE,
                null, null, PageRequest.of(0, 20));
        Assertions.assertEquals(2, preventiveOnly.summary().completedWorkOrders());
        Assertions.assertEquals(210, preventiveOnly.summary().totalDurationMinutes());

        MaintenanceHistoryReportResponse pressOnly = reportService.getReport(
                org1.getId(), from, today, press.id(), null, null, null, PageRequest.of(0, 20));
        Assertions.assertEquals(2, pressOnly.summary().completedWorkOrders());
        Assertions.assertEquals(0, pressOnly.summary().preventiveMaintenance());
        Assertions.assertEquals(2, pressOnly.summary().breakdownWorkOrders());

        MaintenanceHistoryReportResponse ashaOnly = reportService.getReport(
                org1.getId(), from, today, null, null, "Asha", null, PageRequest.of(0, 20));
        Assertions.assertEquals(2, ashaOnly.summary().completedWorkOrders());
        Assertions.assertTrue(ashaOnly.workOrders().content().stream()
                .allMatch(r -> "Asha".equals(r.technician())));

        MaintenanceHistoryReportResponse notOperational = reportService.getReport(
                org1.getId(), from, today, null, null, null, false, PageRequest.of(0, 20));
        Assertions.assertEquals(1, notOperational.summary().completedWorkOrders());
        Assertions.assertEquals(mwo5.id(), notOperational.workOrders().content().get(0).workOrderId());

        byte[] csv = reportService.exportCsv(org1.getId(), from, today, null, null, null, null);
        String text = new String(csv, StandardCharsets.UTF_8);
        Assertions.assertTrue(text.contains(mwo2.workOrderNumber()));
        Assertions.assertTrue(text.contains("Hydraulic Press 01"));
        Assertions.assertTrue(text.contains("BREAKDOWN"));
        Assertions.assertTrue(text.contains("No"));

        MaintenanceHistoryReportResponse other = reportService.getReport(
                org2.getId(), from, today, null, null, null, null, PageRequest.of(0, 10));
        Assertions.assertEquals(0, other.summary().completedWorkOrders());
        Assertions.assertTrue(other.byEquipment().isEmpty());
    }
}
