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
    name = "opening_stocks",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_opening_stock_org_number", columnNames = {"organization_id", "opening_stock_number"})
    }
)
public class OpeningStock extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Column(name = "opening_stock_number", nullable = false, length = 50)
    private String openingStockNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "warehouse_id", nullable = false)
    private Warehouse warehouse;

    @Column(name = "opening_date", nullable = false)
    private LocalDate openingDate;

    @Column(length = 1000)
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private OpeningStockStatus status = OpeningStockStatus.DRAFT;

    @OneToMany(mappedBy = "openingStock", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<OpeningStockItem> items = new ArrayList<>();

    public void addItem(OpeningStockItem item) {
        items.add(item);
        item.setOpeningStock(this);
    }

    public void clearItems() {
        items.clear();
    }

    @Version
    @Column(name = "version")
    private Long version;

}
