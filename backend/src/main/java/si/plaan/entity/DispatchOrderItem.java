package si.plaan.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "dispatch_order_items")
public class DispatchOrderItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "dispatch_order_id", nullable = false)
    private DispatchOrder dispatchOrder;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sales_order_item_id", nullable = false)
    private SalesOrderItem salesOrderItem;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "item_id", nullable = false)
    private Item item;

    @Column(name = "unit_of_measure", nullable = false, length = 30)
    private String unitOfMeasure;

    @Column(name = "ordered_quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal orderedQuantity;

    @Column(name = "previously_dispatched_quantity", nullable = false, precision = 12, scale = 3)
    @Builder.Default
    private BigDecimal previouslyDispatchedQuantity = BigDecimal.ZERO;

    @Column(name = "dispatch_quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal dispatchQuantity;

    @Column(name = "remaining_quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal remainingQuantity;
}
