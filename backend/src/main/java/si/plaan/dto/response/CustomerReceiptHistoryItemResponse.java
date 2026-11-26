package si.plaan.dto.response;

import si.plaan.entity.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CustomerReceiptHistoryItemResponse(
    Long id,
    String receiptNumber,
    LocalDate receiptDate,
    PaymentMethod paymentMethod,
    String paymentReference,
    BigDecimal amount
) {}
