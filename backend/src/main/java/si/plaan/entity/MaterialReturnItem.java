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
@Table(name = "material_return_items")
public class MaterialReturnItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "material_return_id", nullable = false)
    private MaterialReturn materialReturn;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "material_id", nullable = false)
    private Item material;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "production_order_item_id")
    private ProductionOrderItem productionOrderItem;

    @Column(name = "return_quantity", nullable = false, precision = 15, scale = 4)
    private BigDecimal returnQuantity;

    @Column(name = "unit_of_measure", nullable = false, length = 30)
    private String unitOfMeasure;
}
