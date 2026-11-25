package si.plaan.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
    name = "stock_adjustments",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_stock_adjustment_org_number", columnNames = {"organization_id", "adjustment_number"})
    }
)
public class StockAdjustment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Column(name = "adjustment_number", nullable = false, length = 50)
    private String adjustmentNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "warehouse_id", nullable = false)
    private Warehouse warehouse;

    @Column(name = "adjustment_date", nullable = false)
    private LocalDate adjustmentDate;

    @Column(nullable = false, length = 100)
    private String reason;

    @Column(length = 1000)
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private StockAdjustmentStatus status = StockAdjustmentStatus.DRAFT;

    @OneToMany(mappedBy = "stockAdjustment", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<StockAdjustmentItem> items = new ArrayList<>();

    public void addItem(StockAdjustmentItem item) {
        items.add(item);
        item.setStockAdjustment(this);
    }

    public void clearItems() {
        items.clear();
    }
}
