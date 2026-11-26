package si.plaan.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

public record EligiblePurchaseInvoiceResponse(
    Long id,
    String invoiceNumber,
    LocalDate invoiceDate,
    Long supplierId,
    String supplierCode,
    String supplierName,
    BigDecimal totalAmount,
    BigDecimal paidAmount,
    BigDecimal outstandingAmount
) {}
