package si.plaan.entity;

import jakarta.persistence.CascadeType;
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
    name = "material_consumptions",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_material_consumptions_org_number", columnNames = {"organization_id", "consumption_number"})
    }
)
public class MaterialConsumption extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Column(name = "consumption_number", nullable = false, length = 50)
    private String consumptionNumber;

    @Column(name = "consumption_date", nullable = false)
    private LocalDate consumptionDate;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "production_order_id", nullable = false)
    private ProductionOrder productionOrder;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 20)
    private MaterialConsumptionStatus status = MaterialConsumptionStatus.DRAFT;

    @Column(length = 1000)
    private String notes;

    @Builder.Default
    @OneToMany(mappedBy = "materialConsumption", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<MaterialConsumptionItem> items = new ArrayList<>();
}
