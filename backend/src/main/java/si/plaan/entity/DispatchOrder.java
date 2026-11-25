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
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
    name = "dispatch_orders",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_dispatch_org_number", columnNames = {"organization_id", "dispatch_number"})
    }
)
public class DispatchOrder extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Column(name = "dispatch_number", nullable = false, length = 50)
    private String dispatchNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sales_order_id", nullable = false)
    private SalesOrder salesOrder;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "dispatch_warehouse_id", nullable = false)
    private Warehouse dispatchWarehouse;

    @Column(name = "dispatch_date", nullable = false)
    private LocalDate dispatchDate;

    @Column(name = "shipping_address", length = 500)
    private String shippingAddress;

    @Column(name = "transporter_name", length = 150)
    private String transporterName;

    @Column(name = "vehicle_number", length = 50)
    private String vehicleNumber;

    @Column(name = "transport_reference", length = 100)
    private String transportReference;

    @Column(length = 1000)
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private DispatchOrderStatus status = DispatchOrderStatus.DRAFT;

    @Column(name = "posted_at")
    private LocalDateTime postedAt;

    @OneToMany(mappedBy = "dispatchOrder", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<DispatchOrderItem> items = new ArrayList<>();

    public void addItem(DispatchOrderItem item) {
        items.add(item);
        item.setDispatchOrder(this);
    }

    public void clearItems() {
        items.clear();
    }
}
