package si.plaan.dto.response;

import si.plaan.entity.InvoicePaymentStatus;
import si.plaan.entity.PurchaseInvoiceStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record PurchaseInvoiceResponse(
    Long id,
    String invoiceNumber,
    String supplierInvoiceNumber,
    LocalDate invoiceDate,
    LocalDate paymentDueDate,
    Long goodsReceiptId,
    String grnNumber,
    Long purchaseOrderId,
    String poNumber,
    Long supplierId,
    String supplierCode,
    String supplierName,
    BigDecimal subtotal,
    BigDecimal taxAmount,
    BigDecimal totalAmount,
    BigDecimal paidAmount,
    BigDecimal outstandingAmount,
    InvoicePaymentStatus paymentStatus,
    List<SupplierPaymentHistoryItemResponse> paymentHistory,
    String attachmentFileName,
    String attachmentContentType,
    boolean hasAttachment,
    String notes,
    PurchaseInvoiceStatus status,
    int itemsCount,
    List<PurchaseInvoiceItemResponse> items,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
