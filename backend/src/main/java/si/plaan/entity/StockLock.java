package si.plaan.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Row used only for pessimistic locking of item×warehouse stock checks.
 * On-hand qty still comes from StockMovement sums.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
    name = "stock_locks",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_stock_lock_org_item_wh", columnNames = {"organization_id", "item_id", "warehouse_id"})
    }
)
public class StockLock extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "item_id", nullable = false)
    private Item item;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "warehouse_id", nullable = false)
    private Warehouse warehouse;
}
