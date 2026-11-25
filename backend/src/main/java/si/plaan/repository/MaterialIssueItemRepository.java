package si.plaan.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import si.plaan.entity.MaterialIssueItem;

import java.util.List;

@Repository
public interface MaterialIssueItemRepository extends JpaRepository<MaterialIssueItem, Long> {

    List<MaterialIssueItem> findByMaterialIssueId(Long materialIssueId);
}
