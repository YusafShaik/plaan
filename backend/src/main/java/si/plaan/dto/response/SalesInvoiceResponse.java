package si.plaan.dto.response;

import si.plaan.entity.InvoicePaymentStatus;
import si.plaan.entity.SalesInvoiceStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record SalesInvoiceResponse(
    Long id,
    String invoiceNumber,
    LocalDate invoiceDate,
    LocalDate paymentDueDate,
    Long dispatchOrderId,
    String dispatchNumber,
    Long salesOrderId,
    String salesOrderNumber,
    Long customerId,
    String customerCode,
    String customerName,
    String billingAddress,
    String shippingAddress,
    BigDecimal subtotal,
    BigDecimal taxAmount,
    BigDecimal totalAmount,
    BigDecimal receivedAmount,
    BigDecimal outstandingAmount,
    InvoicePaymentStatus paymentStatus,
    List<CustomerReceiptHistoryItemResponse> receiptHistory,
    String notes,
    SalesInvoiceStatus status,
    int itemsCount,
    List<SalesInvoiceItemResponse> items,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
