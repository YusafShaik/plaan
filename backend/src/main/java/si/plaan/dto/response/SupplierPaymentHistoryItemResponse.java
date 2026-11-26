package si.plaan.dto.response;

import si.plaan.entity.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDate;

public record SupplierPaymentHistoryItemResponse(
    Long id,
    String paymentNumber,
    LocalDate paymentDate,
    PaymentMethod paymentMethod,
    String paymentReference,
    BigDecimal amount
) {}
