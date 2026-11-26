package si.plaan.service;

import org.springframework.data.domain.Pageable;
import si.plaan.dto.response.ExpenseReportResponse;
import si.plaan.entity.PaymentMethod;

import java.time.LocalDate;

public interface ExpenseReportService {

    ExpenseReportResponse getReport(
            Long orgId,
            LocalDate fromDate,
            LocalDate toDate,
            Long categoryId,
            PaymentMethod paymentMethod,
            String search,
            Pageable pageable);

    byte[] exportCsv(
            Long orgId,
            LocalDate fromDate,
            LocalDate toDate,
            Long categoryId,
            PaymentMethod paymentMethod,
            String search);
}
