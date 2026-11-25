package si.plaan.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import si.plaan.entity.MaterialReturnItem;

import java.util.List;

@Repository
public interface MaterialReturnItemRepository extends JpaRepository<MaterialReturnItem, Long> {

    List<MaterialReturnItem> findByMaterialReturnId(Long materialReturnId);
}
