package si.plaan.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import si.plaan.entity.DispatchOrderItem;

import java.util.List;

@Repository
public interface DispatchOrderItemRepository extends JpaRepository<DispatchOrderItem, Long> {

    List<DispatchOrderItem> findByDispatchOrderId(Long dispatchOrderId);
}
