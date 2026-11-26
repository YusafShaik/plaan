package si.plaan.service;

import org.springframework.data.domain.Pageable;
import si.plaan.dto.request.CreateSalesInvoiceRequest;
import si.plaan.dto.request.UpdateSalesInvoiceRequest;
import si.plaan.dto.response.*;
import si.plaan.entity.SalesInvoiceStatus;

import java.util.List;

public interface SalesInvoiceService {

    PageResponse<SalesInvoiceResponse> getSalesInvoices(
            Long orgId,
            String search,
            SalesInvoiceStatus status,
            Pageable pageable
    );

    SalesInvoiceResponse getSalesInvoiceById(Long orgId, Long id);

    String getNextInvoiceNumber(Long orgId);

    List<EligibleDispatchResponse> getEligibleDispatches(Long orgId);

    EligibleDispatchResponse getDispatchDetailsForInvoice(Long orgId, Long dispatchId);

    SalesInvoiceSummaryResponse getSummary(Long orgId);

    SalesInvoiceResponse createSalesInvoice(Long orgId, CreateSalesInvoiceRequest request);

    SalesInvoiceResponse updateSalesInvoice(Long orgId, Long id, UpdateSalesInvoiceRequest request);

    SalesInvoiceResponse postSalesInvoice(Long orgId, Long id);

    void deleteSalesInvoice(Long orgId, Long id);

    byte[] generateInvoicePdf(Long orgId, Long id);
}
