package si.plaan.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import si.plaan.entity.PurchaseInvoiceItem;

import java.util.List;

@Repository
public interface PurchaseInvoiceItemRepository extends JpaRepository<PurchaseInvoiceItem, Long> {

    List<PurchaseInvoiceItem> findByPurchaseInvoiceId(Long purchaseInvoiceId);
}
