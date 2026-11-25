package si.plaan.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import si.plaan.entity.ItemType;

import java.util.List;
import java.util.Optional;

@Repository
public interface ItemTypeRepository extends JpaRepository<ItemType, Long> {

    List<ItemType> findByOrganizationIdOrderByNameAsc(Long organizationId);

    Optional<ItemType> findByOrganizationIdAndNameIgnoreCase(Long organizationId, String name);

    boolean existsByOrganizationIdAndNameIgnoreCase(Long organizationId, String name);

    Optional<ItemType> findByIdAndOrganizationId(Long id, Long organizationId);
}
