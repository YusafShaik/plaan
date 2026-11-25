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
@Table(name = "stock_adjustment_items")
public class StockAdjustmentItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "stock_adjustment_id", nullable = false)
    private StockAdjustment stockAdjustment;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "item_id", nullable = false)
    private Item item;

    @Column(name = "system_quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal systemQuantity;

    @Column(name = "physical_quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal physicalQuantity;

    @Column(name = "adjustment_quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal adjustmentQuantity;

    @Column(name = "unit_of_measure", nullable = false, length = 30)
    private String unitOfMeasure;
}
