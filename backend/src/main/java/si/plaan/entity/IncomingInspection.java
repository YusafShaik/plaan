package si.plaan.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
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
    name = "incoming_inspections",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_iqc_org_number", columnNames = {"organization_id", "inspection_number"}),
        @UniqueConstraint(name = "uk_iqc_org_grn_item", columnNames = {"organization_id", "goods_receipt_item_id"})
    }
)
public class IncomingInspection extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Column(name = "inspection_number", nullable = false, length = 50)
    private String inspectionNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "goods_receipt_id", nullable = false)
    private GoodsReceipt goodsReceipt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "goods_receipt_item_id", nullable = false)
    private GoodsReceiptItem goodsReceiptItem;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "item_id", nullable = false)
    private Item item;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "warehouse_id", nullable = false)
    private Warehouse warehouse;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "supplier_id", nullable = false)
    private Supplier supplier;

    @Column(name = "received_quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal receivedQuantity;

    @Column(name = "unit_of_measure", nullable = false, length = 30)
    private String unitOfMeasure;

    @Column(name = "template_id")
    private Long templateId;

    @Column(name = "template_code", length = 50)
    private String templateCode;

    @Column(name = "template_name", length = 200)
    private String templateName;

    @Column(name = "inspection_date")
    private LocalDate inspectionDate;

    @Column(name = "accepted_quantity", precision = 12, scale = 3)
    private BigDecimal acceptedQuantity;

    @Column(name = "rejected_quantity", precision = 12, scale = 3)
    private BigDecimal rejectedQuantity;

    @Column(length = 2000)
    private String remarks;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inspected_by_id")
    private User inspectedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private IncomingInspectionStatus status = IncomingInspectionStatus.PENDING;

    @Version
    @Column(name = "version")
    private Long version;

    @Builder.Default
    @OneToMany(mappedBy = "inspection", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC, id ASC")
    private List<IncomingInspectionParameter> parameters = new ArrayList<>();

    public void addParameter(IncomingInspectionParameter parameter) {
        parameters.add(parameter);
        parameter.setInspection(this);
    }
}
