package si.plaan.service;

import org.springframework.data.domain.Pageable;
import si.plaan.dto.request.CreatePurchaseInvoiceRequest;
import si.plaan.dto.request.UpdatePurchaseInvoiceRequest;
import si.plaan.dto.response.*;
import si.plaan.entity.PurchaseInvoiceStatus;

import java.util.List;

public interface PurchaseInvoiceService {

    PageResponse<PurchaseInvoiceResponse> getPurchaseInvoices(
            Long orgId,
            String search,
            PurchaseInvoiceStatus status,
            Pageable pageable
    );

    PurchaseInvoiceResponse getPurchaseInvoiceById(Long orgId, Long id);

    String getNextInvoiceNumber(Long orgId);

    List<EligibleGrnResponse> getEligibleGoodsReceipts(Long orgId);

    EligibleGrnResponse getGoodsReceiptDetailsForInvoice(Long orgId, Long grnId);

    PurchaseInvoiceSummaryResponse getSummary(Long orgId);

    PurchaseInvoiceResponse createPurchaseInvoice(Long orgId, CreatePurchaseInvoiceRequest request);

    PurchaseInvoiceResponse updatePurchaseInvoice(Long orgId, Long id, UpdatePurchaseInvoiceRequest request);

    PurchaseInvoiceResponse postPurchaseInvoice(Long orgId, Long id);

    void deletePurchaseInvoice(Long orgId, Long id);

    byte[] generateInvoicePdf(Long orgId, Long id);

    record AttachmentData(String fileName, String contentType, byte[] bytes) {}

    AttachmentData getAttachment(Long orgId, Long id);
}
