package si.plaan.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.response.CustomerOutstandingReportResponse;
import si.plaan.dto.response.DashboardAttentionResponse;
import si.plaan.dto.response.DashboardEquipmentStatusResponse;
import si.plaan.dto.response.DashboardMetricsResponse;
import si.plaan.dto.response.DashboardOverviewResponse;
import si.plaan.dto.response.DashboardProductionOrdersResponse;
import si.plaan.dto.response.DashboardTrendMonthResponse;
import si.plaan.dto.response.DueOverdueMaintenanceReportResponse;
import si.plaan.dto.response.InspectionSummaryReportResponse;
import si.plaan.dto.response.PendingDispatchReportResponse;
import si.plaan.dto.response.PendingPurchaseOrderReportResponse;
import si.plaan.dto.response.ProductionOrderAvailabilityResponse;
import si.plaan.dto.response.SupplierOutstandingReportResponse;
import si.plaan.entity.DeliveryScheduleStatus;
import si.plaan.entity.EquipmentOperationalStatus;
import si.plaan.entity.EquipmentRecordStatus;
import si.plaan.entity.Organization;
import si.plaan.entity.ProductionOrder;
import si.plaan.entity.ProductionOrderStatus;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.EquipmentRepository;
import si.plaan.repository.OrganizationRepository;
import si.plaan.repository.ProductionOrderRepository;
import si.plaan.repository.PurchaseInvoiceRepository;
import si.plaan.repository.SalesInvoiceRepository;
import si.plaan.service.CustomerOutstandingReportService;
import si.plaan.service.DashboardService;
import si.plaan.service.DueOverdueMaintenanceReportService;
import si.plaan.service.InspectionSummaryReportService;
import si.plaan.service.PendingDispatchReportService;
import si.plaan.service.PendingPurchaseOrderReportService;
import si.plaan.service.ProductionOrderService;
import si.plaan.service.SupplierOutstandingReportService;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private static final PageRequest SUMMARY_PAGE = PageRequest.of(0, 1);

    private final OrganizationRepository organizationRepository;
    private final SalesInvoiceRepository salesInvoiceRepository;
    private final PurchaseInvoiceRepository purchaseInvoiceRepository;
    private final ProductionOrderRepository productionOrderRepository;
    private final EquipmentRepository equipmentRepository;
    private final CustomerOutstandingReportService customerOutstandingReportService;
    private final SupplierOutstandingReportService supplierOutstandingReportService;
    private final PendingPurchaseOrderReportService pendingPurchaseOrderReportService;
    private final PendingDispatchReportService pendingDispatchReportService;
    private final DueOverdueMaintenanceReportService dueOverdueMaintenanceReportService;
    private final InspectionSummaryReportService inspectionSummaryReportService;
    private final ProductionOrderService productionOrderService;

    @Override
    @Transactional(readOnly = true)
    public DashboardOverviewResponse getOverview(Long orgId) {
        Organization org = requireOrg(orgId);
        ZoneId zone = resolveOrgZone(org);
        LocalDate today = LocalDate.now(zone);
        LocalDate monthStart = today.withDayOfMonth(1);
        YearMonth currentMonth = YearMonth.from(today);

        BigDecimal salesInvoiced = nz(salesInvoiceRepository.sumPostedTotalBetween(orgId, monthStart, today));
        BigDecimal purchasesInvoiced = nz(purchaseInvoiceRepository.sumPostedTotalBetween(orgId, monthStart, today));

        CustomerOutstandingReportResponse customerOutstanding =
                customerOutstandingReportService.getReport(
                        orgId, null, null, null, null, null, null, null, SUMMARY_PAGE);
        SupplierOutstandingReportResponse supplierOutstanding =
                supplierOutstandingReportService.getReport(
                        orgId, null, null, null, null, null, null, null, SUMMARY_PAGE);

        DashboardMetricsResponse metrics = new DashboardMetricsResponse(
                salesInvoiced,
                purchasesInvoiced,
                nz(customerOutstanding.summary().totalReceivable()),
                nz(supplierOutstanding.summary().totalOutstanding())
        );

        List<DashboardTrendMonthResponse> trend = buildTrend(orgId, currentMonth);

        DashboardProductionOrdersResponse productionOrders = new DashboardProductionOrdersResponse(
                productionOrderRepository.countByOrganizationIdAndStatus(orgId, ProductionOrderStatus.RELEASED),
                productionOrderRepository.countByOrganizationIdAndStatus(orgId, ProductionOrderStatus.IN_PROGRESS),
                productionOrderRepository.countByOrganizationIdAndStatus(orgId, ProductionOrderStatus.COMPLETED),
                productionOrderRepository.countByOrganizationIdAndStatus(orgId, ProductionOrderStatus.CLOSED)
        );

        long operational = equipmentRepository.countByOrganizationIdAndRecordStatusAndOperationalStatus(
                orgId, EquipmentRecordStatus.ACTIVE, EquipmentOperationalStatus.OPERATIONAL);
        long breakdown = equipmentRepository.countByOrganizationIdAndRecordStatusAndOperationalStatus(
                orgId, EquipmentRecordStatus.ACTIVE, EquipmentOperationalStatus.BREAKDOWN);
        long underMaintenance = equipmentRepository.countByOrganizationIdAndRecordStatusAndOperationalStatus(
                orgId, EquipmentRecordStatus.ACTIVE, EquipmentOperationalStatus.UNDER_MAINTENANCE);
        long activeMachines = equipmentRepository.countByOrganizationIdAndRecordStatus(
                orgId, EquipmentRecordStatus.ACTIVE);

        DashboardEquipmentStatusResponse equipmentStatus = new DashboardEquipmentStatusResponse(
                breakdown, operational, underMaintenance, activeMachines);

        DashboardAttentionResponse attention = buildAttention(orgId, breakdown);

        String periodLabel = today.getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH)
                + " " + today.getYear();

        return new DashboardOverviewResponse(
                org.getBaseCurrency() != null ? org.getBaseCurrency() : "INR",
                periodLabel,
                monthStart,
                today,
                metrics,
                trend,
                productionOrders,
                equipmentStatus,
                attention
        );
    }

    private DashboardAttentionResponse buildAttention(Long orgId, long equipmentBreakdowns) {
        PendingPurchaseOrderReportResponse pendingPos = pendingPurchaseOrderReportService.getReport(
                orgId, null, null, null, null, null, null, SUMMARY_PAGE);
        PendingDispatchReportResponse pendingDispatches = pendingDispatchReportService.getReport(
                orgId, null, null, null, null, null, null, null, SUMMARY_PAGE);
        DueOverdueMaintenanceReportResponse maintenance =
                dueOverdueMaintenanceReportService.getReport(
                        orgId, null, null, null, null, null, SUMMARY_PAGE);
        // All-time pending/draft inspections — not limited to current month.
        InspectionSummaryReportResponse inspections = inspectionSummaryReportService.getReport(
                orgId, null, null, null, null, null, null, SUMMARY_PAGE);

        CustomerOutstandingReportResponse overdueCustomerInvoices =
                customerOutstandingReportService.getReport(
                        orgId, null, null, null, null, null, null,
                        DeliveryScheduleStatus.OVERDUE, SUMMARY_PAGE);
        SupplierOutstandingReportResponse overdueSupplierInvoices =
                supplierOutstandingReportService.getReport(
                        orgId, null, null, null, null, null, null,
                        DeliveryScheduleStatus.OVERDUE, SUMMARY_PAGE);

        return new DashboardAttentionResponse(
                pendingPos.summary().overduePos(),
                pendingDispatches.summary().overdueOrders(),
                countMaterialShortages(orgId),
                inspections.summary().awaitingCompletion(),
                overdueCustomerInvoices.summary().outstandingInvoices(),
                overdueSupplierInvoices.summary().outstandingInvoices(),
                maintenance.summary().overdue(),
                equipmentBreakdowns
        );
    }

    private long countMaterialShortages(Long orgId) {
        List<ProductionOrder> openOrders = productionOrderRepository.findByOrganizationIdAndStatusIn(
                orgId,
                EnumSet.of(ProductionOrderStatus.RELEASED, ProductionOrderStatus.IN_PROGRESS));
        long count = 0;
        for (ProductionOrder order : openOrders) {
            ProductionOrderAvailabilityResponse availability =
                    productionOrderService.checkMaterialAvailability(orgId, order.getId());
            if ("MATERIAL_SHORTAGE".equals(availability.getOverallAvailability())) {
                count++;
            }
        }
        return count;
    }

    private List<DashboardTrendMonthResponse> buildTrend(Long orgId, YearMonth currentMonth) {
        YearMonth startMonth = currentMonth.minusMonths(5);
        LocalDate from = startMonth.atDay(1);
        LocalDate to = currentMonth.atEndOfMonth();

        Map<String, BigDecimal> salesByMonth = toMonthMap(
                salesInvoiceRepository.sumPostedTotalGroupedByMonth(orgId, from, to));
        Map<String, BigDecimal> purchasesByMonth = toMonthMap(
                purchaseInvoiceRepository.sumPostedTotalGroupedByMonth(orgId, from, to));

        List<DashboardTrendMonthResponse> trend = new ArrayList<>(6);
        for (int i = 0; i < 6; i++) {
            YearMonth month = startMonth.plusMonths(i);
            String key = month.toString();
            String label = month.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH);
            trend.add(new DashboardTrendMonthResponse(
                    key,
                    label,
                    salesByMonth.getOrDefault(key, BigDecimal.ZERO),
                    purchasesByMonth.getOrDefault(key, BigDecimal.ZERO)
            ));
        }
        return trend;
    }

    private static Map<String, BigDecimal> toMonthMap(List<Object[]> rows) {
        Map<String, BigDecimal> map = new HashMap<>();
        for (Object[] row : rows) {
            int year = ((Number) row[0]).intValue();
            int month = ((Number) row[1]).intValue();
            BigDecimal amount = row[2] instanceof BigDecimal bd ? bd : new BigDecimal(row[2].toString());
            map.put(YearMonth.of(year, month).toString(), nz(amount));
        }
        return map;
    }

    private ZoneId resolveOrgZone(Organization org) {
        if (org.getTimeZone() == null || org.getTimeZone().isBlank()) {
            return ZoneId.systemDefault();
        }
        try {
            return ZoneId.of(org.getTimeZone());
        } catch (Exception ex) {
            return ZoneId.systemDefault();
        }
    }

    private Organization requireOrg(Long orgId) {
        if (orgId == null) throw new AccessDeniedException("Organization context required");
        return organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with id: " + orgId));
    }

    private static BigDecimal nz(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }
}
