package si.plaan.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.response.CustomerOutstandingBreakdownResponse;
import si.plaan.dto.response.CustomerOutstandingReportResponse;
import si.plaan.dto.response.CustomerOutstandingRowResponse;
import si.plaan.dto.response.CustomerOutstandingTotalsResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.entity.DeliveryScheduleStatus;
import si.plaan.entity.InvoicePaymentStatus;
import si.plaan.entity.Organization;
import si.plaan.entity.SalesInvoice;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.OrganizationRepository;
import si.plaan.repository.SalesInvoiceRepository;
import si.plaan.service.CustomerOutstandingReportService;

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
public class CustomerOutstandingReportServiceImpl implements CustomerOutstandingReportService {

    private final SalesInvoiceRepository salesInvoiceRepository;
    private final OrganizationRepository organizationRepository;

    @Override
    @Transactional(readOnly = true)
    public CustomerOutstandingReportResponse getReport(
            Long orgId,
            Long customerId,
            LocalDate invoiceFrom,
            LocalDate invoiceTo,
            LocalDate dueFrom,
            LocalDate dueTo,
            InvoicePaymentStatus paymentStatus,
            DeliveryScheduleStatus dueStatus,
            Pageable pageable) {
        Organization org = requireOrg(orgId);
        LocalDate today = LocalDate.now(resolveOrgZone(org));
        List<CustomerOutstandingRowResponse> all = buildRows(
                orgId, customerId, invoiceFrom, invoiceTo, dueFrom, dueTo,
                paymentStatus, dueStatus, today);

        CustomerOutstandingTotalsResponse summary = computeSummary(all);
        List<CustomerOutstandingBreakdownResponse> byCustomer = computeCustomerBreakdown(all);

        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), all.size());
        List<CustomerOutstandingRowResponse> pageContent =
                start >= all.size() ? List.of() : all.subList(start, end);

        return new CustomerOutstandingReportResponse(
                org.getBaseCurrency() != null ? org.getBaseCurrency() : "INR",
                summary,
                byCustomer,
                PageResponse.from(new PageImpl<>(pageContent, pageable, all.size()))
        );
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportCsv(
            Long orgId,
            Long customerId,
            LocalDate invoiceFrom,
            LocalDate invoiceTo,
            LocalDate dueFrom,
            LocalDate dueTo,
            InvoicePaymentStatus paymentStatus,
            DeliveryScheduleStatus dueStatus) {
        Organization org = requireOrg(orgId);
        LocalDate today = LocalDate.now(resolveOrgZone(org));
        List<CustomerOutstandingRowResponse> rows = buildRows(
                orgId, customerId, invoiceFrom, invoiceTo, dueFrom, dueTo,
                paymentStatus, dueStatus, today);

        StringBuilder csv = new StringBuilder();
        csv.append("Sales Invoice Number,Invoice Date,Customer,Invoice Amount,Received Amount,")
                .append("Outstanding Amount,Due Date,Days Overdue,Payment Status,Due Status\n");
        for (CustomerOutstandingRowResponse row : rows) {
            csv.append(csvCell(row.invoiceNumber())).append(',')
                    .append(row.invoiceDate()).append(',')
                    .append(csvCell(row.customerName())).append(',')
                    .append(money(row.invoiceAmount())).append(',')
                    .append(money(row.receivedAmount())).append(',')
                    .append(money(row.outstandingAmount())).append(',')
                    .append(row.dueDate() != null ? row.dueDate() : "").append(',')
                    .append(row.daysOverdue() != null ? row.daysOverdue() : "").append(',')
                    .append(row.paymentStatus().name()).append(',')
                    .append(row.dueStatus().name())
                    .append('\n');
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private List<CustomerOutstandingRowResponse> buildRows(
            Long orgId,
            Long customerId,
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

        List<SalesInvoice> invoices =
                salesInvoiceRepository.findPostedOutstandingByOrganizationId(orgId);
        List<CustomerOutstandingRowResponse> rows = new ArrayList<>();

        for (SalesInvoice invoice : invoices) {
            if (customerId != null && !invoice.getCustomer().getId().equals(customerId)) continue;

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

            rows.add(new CustomerOutstandingRowResponse(
                    invoice.getId(),
                    invoice.getInvoiceNumber(),
                    invoiceDate,
                    invoice.getCustomer().getId(),
                    invoice.getCustomer().getName(),
                    nz(invoice.getTotalAmount()),
                    nz(invoice.getReceivedAmount()),
                    nz(invoice.getOutstandingAmount()),
                    dueDate,
                    daysOverdue,
                    payStatus,
                    status
            ));
        }

        rows.sort(Comparator
                .comparing(CustomerOutstandingRowResponse::dueStatus, dueSort())
                .thenComparing(CustomerOutstandingRowResponse::dueDate,
                        Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(CustomerOutstandingRowResponse::invoiceNumber));
        return rows;
    }

    private CustomerOutstandingTotalsResponse computeSummary(List<CustomerOutstandingRowResponse> rows) {
        BigDecimal totalReceivable = BigDecimal.ZERO;
        BigDecimal overdueAmount = BigDecimal.ZERO;
        Set<Long> customers = new HashSet<>();
        for (CustomerOutstandingRowResponse row : rows) {
            totalReceivable = totalReceivable.add(row.outstandingAmount());
            customers.add(row.customerId());
            if (row.dueStatus() == DeliveryScheduleStatus.OVERDUE) {
                overdueAmount = overdueAmount.add(row.outstandingAmount());
            }
        }
        return new CustomerOutstandingTotalsResponse(
                totalReceivable,
                overdueAmount,
                rows.size(),
                customers.size()
        );
    }

    private List<CustomerOutstandingBreakdownResponse> computeCustomerBreakdown(
            List<CustomerOutstandingRowResponse> rows) {
        Map<Long, CustomerOutstandingBreakdownResponse> map = new LinkedHashMap<>();
        for (CustomerOutstandingRowResponse row : rows) {
            map.merge(
                    row.customerId(),
                    new CustomerOutstandingBreakdownResponse(
                            row.customerId(), row.customerName(), row.outstandingAmount()),
                    (existing, incoming) -> new CustomerOutstandingBreakdownResponse(
                            existing.customerId(),
                            existing.customerName(),
                            existing.outstandingAmount().add(incoming.outstandingAmount()))
            );
        }
        return map.values().stream()
                .sorted(Comparator.comparing(CustomerOutstandingBreakdownResponse::outstandingAmount).reversed())
                .toList();
    }

    private InvoicePaymentStatus derivePaymentStatus(SalesInvoice invoice) {
        BigDecimal received = nz(invoice.getReceivedAmount());
        BigDecimal outstanding = nz(invoice.getOutstandingAmount());
        if (received.compareTo(BigDecimal.ZERO) <= 0) {
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
