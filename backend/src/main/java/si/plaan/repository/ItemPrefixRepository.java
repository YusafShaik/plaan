package si.plaan.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import si.plaan.entity.ItemPrefix;

import java.util.List;
import java.util.Optional;

@Repository
public interface ItemPrefixRepository extends JpaRepository<ItemPrefix, Long> {

    List<ItemPrefix> findByOrganizationIdOrderByPrefixAsc(Long organizationId);

    Optional<ItemPrefix> findByIdAndOrganizationId(Long id, Long organizationId);

    Optional<ItemPrefix> findByOrganizationIdAndPrefixIgnoreCase(Long organizationId, String prefix);

    boolean existsByOrganizationIdAndPrefixIgnoreCase(Long organizationId, String prefix);
}
