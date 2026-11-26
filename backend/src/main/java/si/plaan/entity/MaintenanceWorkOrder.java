package si.plaan.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
    name = "maintenance_work_orders",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_mwo_org_number", columnNames = {"organization_id", "work_order_number"})
    }
)
public class MaintenanceWorkOrder extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Column(name = "work_order_number", nullable = false, length = 50)
    private String workOrderNumber;

    @Column(name = "work_order_date", nullable = false)
    private LocalDate workOrderDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "maintenance_type", nullable = false, length = 20)
    private MaintenanceWorkOrderType maintenanceType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private MaintenanceWorkOrderStatus status = MaintenanceWorkOrderStatus.OPEN;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private MaintenanceWorkOrderPriority priority = MaintenanceWorkOrderPriority.MEDIUM;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "equipment_id", nullable = false)
    private Equipment equipment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "maintenance_plan_id")
    private MaintenancePlan maintenancePlan;

    @Column(name = "activity_name", nullable = false, length = 200)
    private String activityName;

    @Column(name = "assigned_to", length = 200)
    private String assignedTo;

    @Column(name = "problem_description", length = 4000)
    private String problemDescription;

    @Column(length = 4000)
    private String instructions;

    @Column(length = 2000)
    private String notes;

    @Column(name = "breakdown_date")
    private LocalDate breakdownDate;

    @Column(name = "breakdown_time")
    private LocalTime breakdownTime;

    /**
     * Root breakdown work order for follow-up repairs on the same outage.
     * Null means this work order is the root event.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "root_breakdown_work_order_id")
    private MaintenanceWorkOrder rootBreakdownWorkOrder;

    @Column(name = "actual_start_at")
    private LocalDateTime actualStartAt;

    @Column(name = "actual_end_at")
    private LocalDateTime actualEndAt;

    @Column(name = "work_performed", length = 4000)
    private String workPerformed;

    @Column(name = "completion_remarks", length = 2000)
    private String completionRemarks;

    @Column(name = "machine_operational")
    private Boolean machineOperational;

    /** Duration of maintenance work in minutes (start → completion). */
    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    /** Breakdown downtime in minutes (breakdown → restore). Null if still unavailable. */
    @Column(name = "downtime_minutes")
    private Integer downtimeMinutes;

    @Version
    @Column(name = "version")
    private Long version;
}
