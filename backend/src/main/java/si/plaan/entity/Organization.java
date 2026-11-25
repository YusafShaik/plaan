package si.plaan.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "organizations")
public class Organization extends BaseEntity {

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, unique = true, length = 60)
    private String slug;

    @Column(length = 60)
    private String country;

    @Column(name = "base_currency", length = 30)
    private String baseCurrency;

    @Column(name = "time_zone", length = 60)
    private String timeZone;

    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;
}
