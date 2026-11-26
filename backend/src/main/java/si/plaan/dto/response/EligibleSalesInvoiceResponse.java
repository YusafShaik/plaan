package si.plaan.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

public record EligibleSalesInvoiceResponse(
    Long id,
    String invoiceNumber,
    LocalDate invoiceDate,
    Long customerId,
    String customerCode,
    String customerName,
    BigDecimal totalAmount,
    BigDecimal receivedAmount,
    BigDecimal outstandingAmount
) {}
