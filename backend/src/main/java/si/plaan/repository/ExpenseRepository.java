package si.plaan.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import si.plaan.entity.Expense;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, Long>, JpaSpecificationExecutor<Expense> {

    Optional<Expense> findByIdAndOrganizationId(Long id, Long organizationId);

    boolean existsByOrganizationIdAndExpenseNumberIgnoreCase(Long organizationId, String expenseNumber);

    @Query(value = "SELECT COALESCE(MAX(CAST(SUBSTRING(expense_number FROM 5) AS INTEGER)), 0) FROM expenses WHERE organization_id = :orgId AND expense_number ~ '^EXP-[0-9]+$'", nativeQuery = true)
    int findMaxExpenseNumberByOrganizationId(@Param("orgId") Long orgId);

    @Query("""
        SELECT COALESCE(SUM(e.amount), 0) FROM Expense e
        WHERE e.organization.id = :orgId
          AND e.status = si.plaan.entity.ExpenseStatus.POSTED
          AND e.expenseDate >= :from
          AND e.expenseDate <= :to
        """)
    BigDecimal sumPostedAmountBetween(
            @Param("orgId") Long orgId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    @Query("""
        SELECT e.category.name, COALESCE(SUM(e.amount), 0)
        FROM Expense e
        WHERE e.organization.id = :orgId
          AND e.status = si.plaan.entity.ExpenseStatus.POSTED
          AND e.expenseDate >= :from
          AND e.expenseDate <= :to
        GROUP BY e.category.name
        ORDER BY SUM(e.amount) DESC
        """)
    List<Object[]> sumPostedByCategoryBetween(
            @Param("orgId") Long orgId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);
}
