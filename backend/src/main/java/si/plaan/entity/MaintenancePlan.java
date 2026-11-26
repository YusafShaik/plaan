package si.plaan.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
    name = "maintenance_plans",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_mp_org_number", columnNames = {"organization_id", "plan_number"})
    }
)
public class MaintenancePlan extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Column(name = "plan_number", nullable = false, length = 50)
    private String planNumber;

    @Column(name = "plan_name", nullable = false, length = 200)
    private String planName;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "equipment_id", nullable = false)
    private Equipment equipment;

    @Column(name = "frequency_days", nullable = false)
    private Integer frequencyDays;

    @Column(name = "first_due_date", nullable = false)
    private LocalDate firstDueDate;

    @Column(name = "next_due_date", nullable = false)
    private LocalDate nextDueDate;

    @Column(name = "last_completed_date")
    private LocalDate lastCompletedDate;

    @Column(name = "instructions", nullable = false, length = 4000)
    private String instructions;

    @Column(length = 2000)
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private MaintenancePlanStatus status = MaintenancePlanStatus.ACTIVE;

    @Version
    @Column(name = "version")
    private Long version;
}
