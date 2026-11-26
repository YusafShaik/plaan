package si.plaan.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import si.plaan.entity.PurchaseInvoiceStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record CreatePurchaseInvoiceRequest(
    String invoiceNumber,
    @NotBlank(message = "Supplier invoice number is required")
    String supplierInvoiceNumber,
    @NotNull(message = "Invoice date is required")
    LocalDate invoiceDate,
    LocalDate paymentDueDate,
    @NotNull(message = "Goods receipt ID is required")
    Long goodsReceiptId,
    @DecimalMin(value = "0.00", message = "Tax amount cannot be negative")
    BigDecimal taxAmount,
    String attachmentFileName,
    String attachmentContentType,
    String attachmentData,
    String notes,
    PurchaseInvoiceStatus status,
    @NotEmpty(message = "At least one invoice line item is required")
    @Valid
    List<PurchaseInvoiceItemRequest> items
) {}
