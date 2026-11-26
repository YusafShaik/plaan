package si.plaan.service;

import org.springframework.data.domain.Pageable;
import si.plaan.dto.request.CreateCustomerReceiptRequest;
import si.plaan.dto.request.UpdateCustomerReceiptRequest;
import si.plaan.dto.response.*;
import si.plaan.entity.CustomerReceiptStatus;

import java.util.List;

public interface CustomerReceiptService {

    PageResponse<CustomerReceiptResponse> getReceipts(
            Long orgId, String search, CustomerReceiptStatus status, Pageable pageable);

    CustomerReceiptResponse getReceiptById(Long orgId, Long id);

    String getNextReceiptNumber(Long orgId);

    List<EligibleSalesInvoiceResponse> getEligibleInvoices(Long orgId);

    EligibleSalesInvoiceResponse getInvoiceDetailsForReceipt(Long orgId, Long invoiceId);

    CustomerReceiptResponse createReceipt(Long orgId, CreateCustomerReceiptRequest request);

    CustomerReceiptResponse updateReceipt(Long orgId, Long id, UpdateCustomerReceiptRequest request);

    CustomerReceiptResponse postReceipt(Long orgId, Long id);

    void deleteReceipt(Long orgId, Long id);
}
