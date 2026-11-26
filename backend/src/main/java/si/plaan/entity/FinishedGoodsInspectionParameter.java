package si.plaan.entity;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "finished_goods_inspection_parameters")
public class FinishedGoodsInspectionParameter extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "inspection_id", nullable = false)
    private FinishedGoodsInspection inspection;

    @Column(name = "parameter_name", nullable = false, length = 200)
    private String parameterName;

    @Column(name = "acceptance_criteria", nullable = false, length = 500)
    private String acceptanceCriteria;

    @Enumerated(EnumType.STRING)
    @Column(name = "result", length = 10)
    private InspectionParameterResult result;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private int sortOrder = 0;
}
