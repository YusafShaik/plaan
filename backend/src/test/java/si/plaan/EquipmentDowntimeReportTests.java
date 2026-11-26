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
import si.plaan.dto.response.EquipmentDowntimeReportResponse;
import si.plaan.dto.response.EquipmentDowntimeRowResponse;
import si.plaan.dto.response.EquipmentResponse;
import si.plaan.dto.response.MaintenancePlanResponse;
import si.plaan.dto.response.MaintenanceWorkOrderResponse;
import si.plaan.entity.*;
import si.plaan.repository.OrganizationRepository;
import si.plaan.service.EquipmentDowntimeReportService;
import si.plaan.service.EquipmentService;
import si.plaan.service.MaintenancePlanService;
import si.plaan.service.MaintenanceWorkOrderService;
import si.plaan.service.impl.EquipmentDowntimeReportServiceImpl;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@SpringBootTest
@Transactional
public class EquipmentDowntimeReportTests {

    @Autowired private EquipmentDowntimeReportService reportService;
    @Autowired private MaintenanceWorkOrderService workOrderService;
    @Autowired private MaintenancePlanService maintenancePlanService;
    @Autowired private EquipmentService equipmentService;
    @Autowired private OrganizationRepository organizationRepository;

    private Organization org1;
    private Organization org2;
    private EquipmentResponse press;
    private EquipmentResponse cnc;
    private EquipmentResponse compressor;
    private LocalDate today;
    private LocalDate from;

    @BeforeEach
    void setup() {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        org1 = organizationRepository.save(Organization.builder()
                .name("ED Org " + uid).slug("ed-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());
        org2 = organizationRepository.save(Organization.builder()
                .name("ED Other " + uid).slug("ed-o-" + uid)
                .country("India").baseCurrency("INR").timeZone("Asia/Kolkata").active(true).build());

        today = LocalDate.now(java.time.ZoneId.of("Asia/Kolkata"));
        from = today.withDayOfMonth(1);

        press = equipmentService.create(org1.getId(), new CreateEquipmentRequest(
                "EQ-PRS", "Hydraulic Press 01", null, null, null, "Floor",
                null, null, EquipmentOperationalStatus.OPERATIONAL, EquipmentRecordStatus.ACTIVE));
        cnc = equipmentService.create(org1.getId(), new CreateEquipmentRequest(
                "EQ-CNC", "CNC Machine 01", null, null, null, "Floor",
                null, null, EquipmentOperationalStatus.OPERATIONAL, EquipmentRecordStatus.ACTIVE));
        compressor = equipmentService.create(org1.getId(), new CreateEquipmentRequest(
                "EQ-AIR", "Air Compressor 01", null, null, null, "Utility",
                null, null, EquipmentOperationalStatus.OPERATIONAL, EquipmentRecordStatus.ACTIVE));
    }

    private MaintenanceWorkOrderResponse createBreakdown(
            EquipmentResponse equipment, LocalDate day, LocalTime breakdownTime, String problem) {
        return workOrderService.create(org1.getId(), new CreateMaintenanceWorkOrderRequest(
                null, day, MaintenanceWorkOrderType.BREAKDOWN,
                equipment.id(), null, MaintenanceWorkOrderPriority.HIGH,
                "Tech", problem, null, day, breakdownTime));
    }

    private MaintenanceWorkOrderResponse complete(
            Long id, LocalDate day, LocalTime start, LocalTime end, boolean operational) {
        workOrderService.start(org1.getId(), id, new StartMaintenanceWorkOrderRequest(day, start));
        return workOrderService.complete(org1.getId(), id, new CompleteMaintenanceWorkOrderRequest(
                "Repair work", day, end, operational, null));
    }

    @Test
    public void testDowntimeEventsChainsRangeFiltersAndIsolation() {
        // Restored single WO: 9:00 → 16:00 = 7 hrs on day 5
        LocalDate d1 = from.plusDays(4);
        MaintenanceWorkOrderResponse mwo1 = createBreakdown(press, d1, LocalTime.of(9, 0), "Press seized");
        complete(mwo1.id(), d1, LocalTime.of(10, 0), LocalTime.of(16, 0), true);
        Assertions.assertEquals(420, workOrderService.getById(org1.getId(), mwo1.id()).downtimeMinutes());

        // Multi-WO chain on CNC: breakdown 9:00, fail at 12:00, restore at 16:00 → 7 hrs one event
        LocalDate d2 = from.plusDays(9);
        MaintenanceWorkOrderResponse first = createBreakdown(cnc, d2, LocalTime.of(9, 0), "Spindle error");
        complete(first.id(), d2, LocalTime.of(10, 0), LocalTime.of(12, 0), false);
        Assertions.assertNull(workOrderService.getById(org1.getId(), first.id()).downtimeMinutes());

        MaintenanceWorkOrderResponse followUp = createBreakdown(
                cnc, d2, LocalTime.of(14, 0), "Follow-up spindle repair");
        Assertions.assertEquals(first.id(), followUp.rootBreakdownWorkOrderId());
        Assertions.assertEquals(LocalTime.of(9, 0), followUp.breakdownTime());
        MaintenanceWorkOrderResponse restoredFollowUp =
                complete(followUp.id(), d2, LocalTime.of(14, 0), LocalTime.of(16, 0), true);
        Assertions.assertEquals(420, restoredFollowUp.downtimeMinutes()); // 9:00 → 16:00

        // Restored compressor 4 hrs
        LocalDate d3 = from.plusDays(14);
        MaintenanceWorkOrderResponse mwo3 = createBreakdown(
                compressor, d3, LocalTime.of(8, 0), "Overheat");
        complete(mwo3.id(), d3, LocalTime.of(8, 30), LocalTime.of(12, 0), true);

        // Another restored CNC 3 hrs
        LocalDate d4 = from.plusDays(19);
        MaintenanceWorkOrderResponse mwo4 = createBreakdown(cnc, d4, LocalTime.of(9, 0), "Tool changer");
        complete(mwo4.id(), d4, LocalTime.of(9, 30), LocalTime.of(12, 0), true);

        // Ongoing press breakdown starting today 8:00 — still open after failed repair? keep open
        MaintenanceWorkOrderResponse ongoing = createBreakdown(
                press, today, LocalTime.of(8, 0), "Hydraulic leak");
        // leave OPEN so ongoing uses now - 8:00

        // Preventive excluded
        MaintenancePlanResponse plan = maintenancePlanService.create(org1.getId(),
                new CreateMaintenancePlanRequest(
                        null, "Lube", cnc.id(), 30, today.plusDays(10),
                        "Lubricate", null, MaintenancePlanStatus.ACTIVE));
        MaintenanceWorkOrderResponse preventive = workOrderService.create(org1.getId(),
                new CreateMaintenanceWorkOrderRequest(
                        null, today, MaintenanceWorkOrderType.PREVENTIVE,
                        cnc.id(), plan.id(), null, "Tech", null, null, null, null));
        complete(preventive.id(), today, LocalTime.of(13, 0), LocalTime.of(14, 0), true);

        EquipmentDowntimeReportResponse report = reportService.getReport(
                org1.getId(), from, today, null, null, PageRequest.of(0, 50));

        Assertions.assertEquals(5, report.summary().totalBreakdownEvents());
        Assertions.assertEquals(4, report.summary().restoredEvents());
        Assertions.assertEquals(1, report.summary().ongoingBreakdowns());

        // Multi-WO chain counts as one event under the root WO
        long cncEvents = report.events().content().stream()
                .filter(r -> r.equipmentId().equals(cnc.id()))
                .count();
        Assertions.assertEquals(2, cncEvents);
        EquipmentDowntimeRowResponse chainEvent = report.events().content().stream()
                .filter(r -> r.rootWorkOrderId().equals(first.id()))
                .findFirst()
                .orElseThrow();
        Assertions.assertEquals(EquipmentDowntimeReportServiceImpl.STATUS_RESTORED, chainEvent.restorationStatus());
        Assertions.assertEquals(420, chainEvent.downtimeMinutes());
        Assertions.assertEquals(first.workOrderNumber(), chainEvent.workOrderNumber());
        Assertions.assertNull(report.events().content().stream()
                .filter(r -> r.rootWorkOrderId().equals(followUp.id()))
                .findFirst()
                .orElse(null));

        EquipmentDowntimeRowResponse ongoingRow = report.events().content().stream()
                .filter(r -> r.rootWorkOrderId().equals(ongoing.id()))
                .findFirst()
                .orElseThrow();
        Assertions.assertEquals(EquipmentDowntimeReportServiceImpl.STATUS_ONGOING, ongoingRow.restorationStatus());
        Assertions.assertNull(ongoingRow.restorationAt());
        Assertions.assertTrue(ongoingRow.downtimeMinutes() >= 0);

        Assertions.assertTrue(report.byEquipment().get(0).downtimeMinutes()
                >= report.byEquipment().get(report.byEquipment().size() - 1).downtimeMinutes());

        EquipmentDowntimeReportResponse ongoingOnly = reportService.getReport(
                org1.getId(), from, today, null,
                EquipmentDowntimeReportServiceImpl.STATUS_ONGOING, PageRequest.of(0, 20));
        Assertions.assertEquals(1, ongoingOnly.summary().totalBreakdownEvents());

        EquipmentDowntimeReportResponse pressOnly = reportService.getReport(
                org1.getId(), from, today, press.id(), null, PageRequest.of(0, 20));
        Assertions.assertEquals(2, pressOnly.summary().totalBreakdownEvents());

        // Range that excludes early events but includes overlap from chain on d2
        EquipmentDowntimeReportResponse midRange = reportService.getReport(
                org1.getId(), d2, d2, null, null, PageRequest.of(0, 20));
        Assertions.assertTrue(midRange.summary().totalBreakdownEvents() >= 1);
        Assertions.assertTrue(midRange.events().content().stream()
                .anyMatch(r -> r.rootWorkOrderId().equals(first.id())));

        byte[] csv = reportService.exportCsv(org1.getId(), from, today, null, null);
        String text = new String(csv, StandardCharsets.UTF_8);
        Assertions.assertTrue(text.contains(mwo1.workOrderNumber()));
        Assertions.assertTrue(text.contains("RESTORED"));
        Assertions.assertTrue(text.contains("ONGOING"));
        Assertions.assertFalse(text.contains(preventive.workOrderNumber()));

        EquipmentDowntimeReportResponse other = reportService.getReport(
                org2.getId(), from, today, null, null, PageRequest.of(0, 10));
        Assertions.assertEquals(0, other.summary().totalBreakdownEvents());
        Assertions.assertTrue(other.byEquipment().isEmpty());
    }
}
