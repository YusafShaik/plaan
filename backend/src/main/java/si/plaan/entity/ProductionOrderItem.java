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
@Table(name = "production_order_items")
public class ProductionOrderItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "production_order_id", nullable = false)
    private ProductionOrder productionOrder;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "material_id", nullable = false)
    private Item material;

    @Column(name = "bom_quantity", nullable = false, precision = 15, scale = 4)
    private BigDecimal bomQuantity;

    @Column(name = "required_quantity", nullable = false, precision = 15, scale = 4)
    private BigDecimal requiredQuantity;

    @Column(name = "issued_quantity", precision = 15, scale = 4)
    @Builder.Default
    private BigDecimal issuedQuantity = BigDecimal.ZERO;

    @Column(name = "consumed_quantity", precision = 15, scale = 4)
    @Builder.Default
    private BigDecimal consumedQuantity = BigDecimal.ZERO;

    @Column(name = "returned_quantity", precision = 15, scale = 4)
    @Builder.Default
    private BigDecimal returnedQuantity = BigDecimal.ZERO;

    @Column(name = "unit_of_measure", nullable = false, length = 30)
    private String unitOfMeasure;

    public BigDecimal getIssuedQuantity() {
        return issuedQuantity != null ? issuedQuantity : BigDecimal.ZERO;
    }

    public BigDecimal getConsumedQuantity() {
        return consumedQuantity != null ? consumedQuantity : BigDecimal.ZERO;
    }

    public BigDecimal getReturnedQuantity() {
        return returnedQuantity != null ? returnedQuantity : BigDecimal.ZERO;
    }

    public BigDecimal getRemainingQuantity() {
        BigDecimal issued = getIssuedQuantity();
        BigDecimal consumed = getConsumedQuantity();
        BigDecimal returned = getReturnedQuantity();
        BigDecimal rem = issued.subtract(consumed).subtract(returned);
        return rem.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : rem;
    }

    public BigDecimal getPendingQuantity() {
        BigDecimal required = requiredQuantity != null ? requiredQuantity : BigDecimal.ZERO;
        BigDecimal netIssued = getIssuedQuantity().subtract(getReturnedQuantity());
        if (netIssued.compareTo(BigDecimal.ZERO) < 0) {
            netIssued = BigDecimal.ZERO;
        }
        BigDecimal pending = required.subtract(netIssued);
        return pending.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : pending;
    }
}
