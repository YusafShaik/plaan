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
    name = "equipment",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_equipment_org_code", columnNames = {"organization_id", "equipment_code"})
    }
)
public class Equipment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Column(name = "equipment_code", nullable = false, length = 50)
    private String equipmentCode;

    @Column(name = "equipment_name", nullable = false, length = 200)
    private String equipmentName;

    @Column(length = 200)
    private String manufacturer;

    @Column(name = "model_number", length = 100)
    private String modelNumber;

    @Column(name = "serial_number", length = 100)
    private String serialNumber;

    @Column(length = 200)
    private String location;

    @Column(name = "installation_date")
    private LocalDate installationDate;

    @Column(length = 2000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "operational_status", nullable = false, length = 30)
    @Builder.Default
    private EquipmentOperationalStatus operationalStatus = EquipmentOperationalStatus.OPERATIONAL;

    @Enumerated(EnumType.STRING)
    @Column(name = "record_status", nullable = false, length = 20)
    @Builder.Default
    private EquipmentRecordStatus recordStatus = EquipmentRecordStatus.ACTIVE;

    @Version
    @Column(name = "version")
    private Long version;
}
