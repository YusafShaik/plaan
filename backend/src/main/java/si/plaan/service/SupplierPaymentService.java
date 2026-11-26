package si.plaan.service;

import org.springframework.data.domain.Pageable;
import si.plaan.dto.request.CreateSupplierPaymentRequest;
import si.plaan.dto.request.UpdateSupplierPaymentRequest;
import si.plaan.dto.response.*;
import si.plaan.entity.SupplierPaymentStatus;

import java.util.List;

public interface SupplierPaymentService {

    PageResponse<SupplierPaymentResponse> getPayments(
            Long orgId,
            String search,
            SupplierPaymentStatus status,
            Pageable pageable
    );

    SupplierPaymentResponse getPaymentById(Long orgId, Long id);

    String getNextPaymentNumber(Long orgId);

    List<EligiblePurchaseInvoiceResponse> getEligibleInvoices(Long orgId);

    EligiblePurchaseInvoiceResponse getInvoiceDetailsForPayment(Long orgId, Long invoiceId);

    SupplierPaymentResponse createPayment(Long orgId, CreateSupplierPaymentRequest request);

    SupplierPaymentResponse updatePayment(Long orgId, Long id, UpdateSupplierPaymentRequest request);

    SupplierPaymentResponse postPayment(Long orgId, Long id);

    void deletePayment(Long orgId, Long id);
}
