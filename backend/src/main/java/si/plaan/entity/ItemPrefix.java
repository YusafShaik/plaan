package si.plaan.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
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
@Table(
    name = "item_prefixes",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_item_prefixes_org_prefix", columnNames = {"organization_id", "prefix"})
    }
)
public class ItemPrefix extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Column(nullable = false, length = 20)
    private String prefix;

    @Column(length = 100)
    private String description;

    @Builder.Default
    @Column(name = "last_number", nullable = false)
    private long lastNumber = 0L;

    @Builder.Default
    @Column(name = "padding_digits", nullable = false)
    private int paddingDigits = 3;

    public String formatCode(long number) {
        String numPart = String.format("%0" + Math.max(1, paddingDigits) + "d", number);
        return prefix + numPart;
    }

    public String getNextCode() {
        return formatCode(lastNumber + 1);
    }
}
