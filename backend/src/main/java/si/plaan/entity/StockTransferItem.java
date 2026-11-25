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
@Table(name = "stock_transfer_items")
public class StockTransferItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "stock_transfer_id", nullable = false)
    private StockTransfer stockTransfer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "item_id", nullable = false)
    private Item item;

    @Column(name = "transfer_quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal transferQuantity;

    @Column(name = "unit_of_measure", nullable = false, length = 30)
    private String unitOfMeasure;
}
