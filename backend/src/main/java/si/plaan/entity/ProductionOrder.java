package si.plaan.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Version;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.math.RoundingMode;
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
    name = "production_orders",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_production_orders_org_number", columnNames = {"organization_id", "order_number"})
    }
)
public class ProductionOrder extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Column(name = "order_number", nullable = false, length = 50)
    private String orderNumber;

    @Column(name = "order_date", nullable = false)
    private LocalDate orderDate;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Item product;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bom_id", nullable = false)
    private Bom bom;

    @Column(name = "bom_code_snapshot", length = 50)
    private String bomCodeSnapshot;

    @Column(name = "bom_output_quantity_snapshot", precision = 15, scale = 4)
    private BigDecimal bomOutputQuantitySnapshot;

    @Column(name = "production_quantity", nullable = false, precision = 15, scale = 4)
    private BigDecimal productionQuantity;

    @Column(name = "received_quantity", precision = 15, scale = 4)
    @Builder.Default
    private BigDecimal receivedQuantity = BigDecimal.ZERO;

    @Column(name = "unit_of_measure", nullable = false, length = 30)
    private String unitOfMeasure;

    @Column(name = "planned_start_date")
    private LocalDate plannedStartDate;

    @Column(name = "planned_end_date")
    private LocalDate plannedEndDate;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "source_warehouse_id", nullable = false)
    private Warehouse sourceWarehouse;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "finished_goods_warehouse_id", nullable = false)
    private Warehouse finishedGoodsWarehouse;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 20)
    private ProductionOrderStatus status = ProductionOrderStatus.DRAFT;

    @Column(length = 1000)
    private String notes;

    @Column(name = "completed_date")
    private LocalDate completedDate;

    @Column(name = "completed_by", length = 255)
    private String completedBy;

    @Column(name = "closed_date")
    private LocalDate closedDate;

    @Column(name = "closed_by", length = 255)
    private String closedBy;

    @Column(name = "closure_notes", length = 1000)
    private String closureNotes;

    @Builder.Default
    @OneToMany(mappedBy = "productionOrder", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ProductionOrderItem> items = new ArrayList<>();

    public BigDecimal getReceivedQuantity() {
        return receivedQuantity != null ? receivedQuantity : BigDecimal.ZERO;
    }

    public BigDecimal getPendingProductionQuantity() {
        BigDecimal total = productionQuantity != null ? productionQuantity : BigDecimal.ZERO;
        BigDecimal pending = total.subtract(getReceivedQuantity());
        return pending.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : pending;
    }

    public BigDecimal getProductionProgress() {
        BigDecimal total = productionQuantity != null ? productionQuantity : BigDecimal.ZERO;
        if (total.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal received = getReceivedQuantity();
        BigDecimal progress = received.multiply(new BigDecimal("100")).divide(total, 2, RoundingMode.HALF_UP);
        if (progress.compareTo(new BigDecimal("100")) > 0) {
            progress = new BigDecimal("100");
        }
        return progress;
    }

    @Version
    @Column(name = "version")
    private Long version;

}
