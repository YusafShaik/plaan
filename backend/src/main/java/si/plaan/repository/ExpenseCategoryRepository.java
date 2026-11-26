package si.plaan.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import si.plaan.entity.ExpenseCategory;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExpenseCategoryRepository extends JpaRepository<ExpenseCategory, Long> {

    List<ExpenseCategory> findByOrganizationIdAndActiveTrueOrderBySortOrderAscNameAsc(Long organizationId);

    List<ExpenseCategory> findByOrganizationIdOrderBySortOrderAscNameAsc(Long organizationId);

    Optional<ExpenseCategory> findByIdAndOrganizationId(Long id, Long organizationId);

    boolean existsByOrganizationIdAndNameIgnoreCase(Long organizationId, String name);

    boolean existsByOrganizationIdAndNameIgnoreCaseAndIdNot(Long organizationId, String name, Long id);

    long countByOrganizationId(Long organizationId);
}
