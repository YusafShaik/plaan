package si.plaan.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "goods_receipt_items")
public class GoodsReceiptItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "goods_receipt_id", nullable = false)
    private GoodsReceipt goodsReceipt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "purchase_order_item_id", nullable = false)
    private PurchaseOrderItem purchaseOrderItem;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "item_id", nullable = false)
    private Item item;

    @Column(name = "unit_of_measure", nullable = false, length = 30)
    private String unitOfMeasure;

    @Column(name = "ordered_quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal orderedQuantity;

    @Column(name = "previously_received_quantity", nullable = false, precision = 12, scale = 3)
    @Builder.Default
    private BigDecimal previouslyReceivedQuantity = BigDecimal.ZERO;

    @Column(name = "received_quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal receivedQuantity;

    @Column(name = "remaining_quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal remainingQuantity;
}
