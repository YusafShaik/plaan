package si.plaan.service;

import org.springframework.data.domain.Pageable;
import si.plaan.dto.request.*;
import si.plaan.dto.response.*;
import si.plaan.entity.ExpenseStatus;
import si.plaan.entity.PaymentMethod;

import java.time.LocalDate;
import java.util.List;

public interface ExpenseService {

    PageResponse<ExpenseResponse> getExpenses(
            Long orgId,
            String search,
            ExpenseStatus status,
            Long categoryId,
            PaymentMethod paymentMethod,
            LocalDate fromDate,
            LocalDate toDate,
            Pageable pageable
    );

    ExpenseResponse getExpenseById(Long orgId, Long id);

    String getNextExpenseNumber(Long orgId);

    ExpenseOverviewResponse getOverview(Long orgId, LocalDate fromDate, LocalDate toDate);

    ExpenseResponse createExpense(Long orgId, CreateExpenseRequest request);

    ExpenseResponse updateExpense(Long orgId, Long id, UpdateExpenseRequest request);

    ExpenseResponse postExpense(Long orgId, Long id);

    void deleteExpense(Long orgId, Long id);

    List<ExpenseCategoryResponse> getCategories(Long orgId, boolean includeInactive);

    ExpenseCategoryResponse createCategory(Long orgId, CreateExpenseCategoryRequest request);

    ExpenseCategoryResponse updateCategory(Long orgId, Long id, UpdateExpenseCategoryRequest request);

    record AttachmentData(String fileName, String contentType, byte[] bytes) {}

    AttachmentData getAttachment(Long orgId, Long id);
}
