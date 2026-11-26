package si.plaan.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import si.plaan.entity.SalesInvoiceStatus;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CreateSalesInvoiceRequest(
    String invoiceNumber,
    @NotNull(message = "Invoice date is required")
    LocalDate invoiceDate,
    LocalDate paymentDueDate,
    @NotNull(message = "Dispatch order ID is required")
    Long dispatchOrderId,
    @DecimalMin(value = "0.00", message = "Tax amount cannot be negative")
    BigDecimal taxAmount,
    String notes,
    SalesInvoiceStatus status
) {}
