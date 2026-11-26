package si.plaan.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.response.PageResponse;
import si.plaan.dto.response.SupplierOutstandingBreakdownResponse;
import si.plaan.dto.response.SupplierOutstandingReportResponse;
import si.plaan.dto.response.SupplierOutstandingRowResponse;
import si.plaan.dto.response.SupplierOutstandingTotalsResponse;
import si.plaan.entity.DeliveryScheduleStatus;
import si.plaan.entity.InvoicePaymentStatus;
import si.plaan.entity.Organization;
import si.plaan.entity.PurchaseInvoice;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.OrganizationRepository;
import si.plaan.repository.PurchaseInvoiceRepository;
import si.plaan.service.SupplierOutstandingReportService;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class SupplierOutstandingReportServiceImpl implements SupplierOutstandingReportService {

    private final PurchaseInvoiceRepository purchaseInvoiceRepository;
    private final OrganizationRepository organizationRepository;

    @Override
    @Transactional(readOnly = true)
    public SupplierOutstandingReportResponse getReport(
            Long orgId,
            Long supplierId,
            LocalDate invoiceFrom,
            LocalDate invoiceTo,
            LocalDate dueFrom,
            LocalDate dueTo,
            InvoicePaymentStatus paymentStatus,
            DeliveryScheduleStatus dueStatus,
            Pageable pageable) {
        Organization org = requireOrg(orgId);
        LocalDate today = LocalDate.now(resolveOrgZone(org));
        List<SupplierOutstandingRowResponse> all = buildRows(
                orgId, supplierId, invoiceFrom, invoiceTo, dueFrom, dueTo,
                paymentStatus, dueStatus, today);

        SupplierOutstandingTotalsResponse summary = computeSummary(all);
        List<SupplierOutstandingBreakdownResponse> bySupplier = computeSupplierBreakdown(all);

        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), all.size());
        List<SupplierOutstandingRowResponse> pageContent =
                start >= all.size() ? List.of() : all.subList(start, end);

        return new SupplierOutstandingReportResponse(
                org.getBaseCurrency() != null ? org.getBaseCurrency() : "INR",
                summary,
                bySupplier,
                PageResponse.from(new PageImpl<>(pageContent, pageable, all.size()))
        );
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportCsv(
            Long orgId,
            Long supplierId,
            LocalDate invoiceFrom,
            LocalDate invoiceTo,
            LocalDate dueFrom,
            LocalDate dueTo,
            InvoicePaymentStatus paymentStatus,
            DeliveryScheduleStatus dueStatus) {
        Organization org = requireOrg(orgId);
        LocalDate today = LocalDate.now(resolveOrgZone(org));
        List<SupplierOutstandingRowResponse> rows = buildRows(
                orgId, supplierId, invoiceFrom, invoiceTo, dueFrom, dueTo,
                paymentStatus, dueStatus, today);

        StringBuilder csv = new StringBuilder();
        csv.append("Purchase Invoice Number,Supplier Invoice Number,Invoice Date,Supplier,")
                .append("Invoice Amount,Paid Amount,Outstanding Amount,Due Date,Days Overdue,")
                .append("Payment Status,Due Status\n");
        for (SupplierOutstandingRowResponse row : rows) {
            csv.append(csvCell(row.invoiceNumber())).append(',')
                    .append(csvCell(row.supplierInvoiceNumber())).append(',')
                    .append(row.invoiceDate()).append(',')
                    .append(csvCell(row.supplierName())).append(',')
                    .append(money(row.invoiceAmount())).append(',')
                    .append(money(row.paidAmount())).append(',')
                    .append(money(row.outstandingAmount())).append(',')
                    .append(row.dueDate() != null ? row.dueDate() : "").append(',')
                    .append(row.daysOverdue() != null ? row.daysOverdue() : "").append(',')
                    .append(row.paymentStatus().name()).append(',')
                    .append(row.dueStatus().name())
                    .append('\n');
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private List<SupplierOutstandingRowResponse> buildRows(
            Long orgId,
            Long supplierId,
            LocalDate invoiceFrom,
            LocalDate invoiceTo,
            LocalDate dueFrom,
            LocalDate dueTo,
            InvoicePaymentStatus paymentStatus,
            DeliveryScheduleStatus dueStatus,
            LocalDate today) {
        validateDateRange(invoiceFrom, invoiceTo, "Invoice");
        validateDateRange(dueFrom, dueTo, "Due");
        validatePaymentStatusFilter(paymentStatus);

        List<PurchaseInvoice> invoices =
                purchaseInvoiceRepository.findPostedOutstandingByOrganizationId(orgId);
        List<SupplierOutstandingRowResponse> rows = new ArrayList<>();

        for (PurchaseInvoice invoice : invoices) {
            if (supplierId != null && !invoice.getSupplier().getId().equals(supplierId)) continue;

            LocalDate invoiceDate = invoice.getInvoiceDate();
            if (invoiceFrom != null && (invoiceDate == null || invoiceDate.isBefore(invoiceFrom))) continue;
            if (invoiceTo != null && (invoiceDate == null || invoiceDate.isAfter(invoiceTo))) continue;

            LocalDate dueDate = invoice.getPaymentDueDate();
            if (dueFrom != null && (dueDate == null || dueDate.isBefore(dueFrom))) continue;
            if (dueTo != null && (dueDate == null || dueDate.isAfter(dueTo))) continue;

            DeliveryScheduleStatus status =
                    PendingPurchaseOrderReportServiceImpl.resolveDeliveryStatus(dueDate, today);
            if (dueStatus != null && status != dueStatus) continue;

            InvoicePaymentStatus payStatus = derivePaymentStatus(invoice);
            if (paymentStatus != null && payStatus != paymentStatus) continue;

            Integer daysOverdue = status == DeliveryScheduleStatus.OVERDUE && dueDate != null
                    ? (int) ChronoUnit.DAYS.between(dueDate, today)
                    : null;

            rows.add(new SupplierOutstandingRowResponse(
                    invoice.getId(),
                    invoice.getInvoiceNumber(),
                    invoice.getSupplierInvoiceNumber(),
                    invoiceDate,
                    invoice.getSupplier().getId(),
                    invoice.getSupplier().getName(),
                    nz(invoice.getTotalAmount()),
                    nz(invoice.getPaidAmount()),
                    nz(invoice.getOutstandingAmount()),
                    dueDate,
                    daysOverdue,
                    payStatus,
                    status
            ));
        }

        rows.sort(Comparator
                .comparing(SupplierOutstandingRowResponse::dueStatus, dueSort())
                .thenComparing(SupplierOutstandingRowResponse::dueDate,
                        Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(SupplierOutstandingRowResponse::invoiceNumber));
        return rows;
    }

    private SupplierOutstandingTotalsResponse computeSummary(List<SupplierOutstandingRowResponse> rows) {
        BigDecimal totalOutstanding = BigDecimal.ZERO;
        BigDecimal overdueAmount = BigDecimal.ZERO;
        Set<Long> suppliers = new HashSet<>();
        for (SupplierOutstandingRowResponse row : rows) {
            totalOutstanding = totalOutstanding.add(row.outstandingAmount());
            suppliers.add(row.supplierId());
            if (row.dueStatus() == DeliveryScheduleStatus.OVERDUE) {
                overdueAmount = overdueAmount.add(row.outstandingAmount());
            }
        }
        return new SupplierOutstandingTotalsResponse(
                totalOutstanding,
                overdueAmount,
                rows.size(),
                suppliers.size()
        );
    }

    private List<SupplierOutstandingBreakdownResponse> computeSupplierBreakdown(
            List<SupplierOutstandingRowResponse> rows) {
        Map<Long, SupplierOutstandingBreakdownResponse> map = new LinkedHashMap<>();
        for (SupplierOutstandingRowResponse row : rows) {
            map.merge(
                    row.supplierId(),
                    new SupplierOutstandingBreakdownResponse(
                            row.supplierId(), row.supplierName(), row.outstandingAmount()),
                    (existing, incoming) -> new SupplierOutstandingBreakdownResponse(
                            existing.supplierId(),
                            existing.supplierName(),
                            existing.outstandingAmount().add(incoming.outstandingAmount()))
            );
        }
        return map.values().stream()
                .sorted(Comparator.comparing(SupplierOutstandingBreakdownResponse::outstandingAmount).reversed())
                .toList();
    }

    private InvoicePaymentStatus derivePaymentStatus(PurchaseInvoice invoice) {
        BigDecimal paid = nz(invoice.getPaidAmount());
        BigDecimal outstanding = nz(invoice.getOutstandingAmount());
        if (paid.compareTo(BigDecimal.ZERO) <= 0) {
            return InvoicePaymentStatus.UNPAID;
        }
        if (outstanding.compareTo(BigDecimal.ZERO) <= 0) {
            return InvoicePaymentStatus.PAID;
        }
        return InvoicePaymentStatus.PARTIALLY_PAID;
    }

    private void validatePaymentStatusFilter(InvoicePaymentStatus paymentStatus) {
        if (paymentStatus == null) return;
        if (paymentStatus == InvoicePaymentStatus.PAID) {
            throw new IllegalArgumentException(
                    "Payment status filter must be UNPAID or PARTIALLY_PAID for outstanding invoices");
        }
    }

    private void validateDateRange(LocalDate from, LocalDate to, String label) {
        if (from != null && to != null && to.isBefore(from)) {
            throw new IllegalArgumentException(label + " To Date cannot be before From Date");
        }
    }

    private Comparator<DeliveryScheduleStatus> dueSort() {
        return Comparator.comparingInt(status -> switch (status) {
            case OVERDUE -> 0;
            case DUE_TODAY -> 1;
            case UPCOMING -> 2;
            case NOT_SCHEDULED -> 3;
        });
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

    private static String money(BigDecimal value) {
        return value != null ? value.stripTrailingZeros().toPlainString() : "0";
    }

    private static String csvCell(String value) {
        if (value == null) return "";
        String escaped = value.replace("\"", "\"\"");
        if (escaped.contains(",") || escaped.contains("\"") || escaped.contains("\n")) {
            return "\"" + escaped + "\"";
        }
        return escaped;
    }
}
