package si.plaan.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;
import si.plaan.entity.Item;

import java.util.Optional;

@Repository
public interface ItemRepository extends JpaRepository<Item, Long>, JpaSpecificationExecutor<Item> {

    Optional<Item> findByIdAndOrganizationId(Long id, Long organizationId);

    boolean existsByOrganizationIdAndItemCodeIgnoreCase(Long organizationId, String itemCode);

    long countByOrganizationId(Long organizationId);

    long countByOrganizationIdAndActive(Long organizationId, boolean active);

    java.util.List<Item> findByOrganizationIdAndActiveTrue(Long organizationId);
}
