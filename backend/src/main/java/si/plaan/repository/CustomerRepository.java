package si.plaan.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import si.plaan.entity.Customer;

import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long>, JpaSpecificationExecutor<Customer> {

    Optional<Customer> findByIdAndOrganizationId(Long id, Long organizationId);

    boolean existsByOrganizationIdAndCustomerCodeIgnoreCase(Long organizationId, String customerCode);

    long countByOrganizationId(Long organizationId);

    long countByOrganizationIdAndActive(Long organizationId, boolean active);

    @Query(value = "SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 5) AS INTEGER)), 0) FROM customers WHERE organization_id = :orgId AND customer_code ~ '^CUS-[0-9]+$'", nativeQuery = true)
    int findMaxCustomerNumberByOrganizationId(@Param("orgId") Long orgId);
}
