package si.plaan.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import si.plaan.dto.request.*;
import si.plaan.dto.response.*;
import si.plaan.entity.ExpenseStatus;
import si.plaan.entity.PaymentMethod;
import si.plaan.security.CustomUserDetails;
import si.plaan.service.ExpenseService;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/finance/expenses")
@RequiredArgsConstructor
public class ExpenseController {

    private final ExpenseService expenseService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ExpenseResponse>>> getExpenses(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) ExpenseStatus status,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) PaymentMethod paymentMethod,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "expenseDate") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {

        Sort sort = "asc".equalsIgnoreCase(direction) ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), sort);

        return ResponseEntity.ok(ApiResponse.success(expenseService.getExpenses(
                userDetails.getOrganizationId(), search, status, categoryId, paymentMethod, fromDate, toDate, pageable)));
    }

    @GetMapping("/next-number")
    public ResponseEntity<ApiResponse<NextCodeResponse>> getNextNumber(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                new NextCodeResponse(expenseService.getNextExpenseNumber(userDetails.getOrganizationId()))));
    }

    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<ExpenseOverviewResponse>> getOverview(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        return ResponseEntity.ok(ApiResponse.success(
                expenseService.getOverview(userDetails.getOrganizationId(), fromDate, toDate)));
    }

    @GetMapping("/categories")
    public ResponseEntity<ApiResponse<List<ExpenseCategoryResponse>>> getCategories(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(defaultValue = "false") boolean includeInactive) {
        return ResponseEntity.ok(ApiResponse.success(
                expenseService.getCategories(userDetails.getOrganizationId(), includeInactive)));
    }

    @PostMapping("/categories")
    public ResponseEntity<ApiResponse<ExpenseCategoryResponse>> createCategory(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CreateExpenseCategoryRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Expense category created",
                expenseService.createCategory(userDetails.getOrganizationId(), request)));
    }

    @PutMapping("/categories/{id}")
    public ResponseEntity<ApiResponse<ExpenseCategoryResponse>> updateCategory(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody UpdateExpenseCategoryRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Expense category updated",
                expenseService.updateCategory(userDetails.getOrganizationId(), id, request)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ExpenseResponse>> getById(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                expenseService.getExpenseById(userDetails.getOrganizationId(), id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ExpenseResponse>> create(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CreateExpenseRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Expense created successfully",
                expenseService.createExpense(userDetails.getOrganizationId(), request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ExpenseResponse>> update(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody UpdateExpenseRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Expense updated successfully",
                expenseService.updateExpense(userDetails.getOrganizationId(), id, request)));
    }

    @PostMapping("/{id}/post")
    public ResponseEntity<ApiResponse<ExpenseResponse>> post(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                "Expense posted successfully",
                expenseService.postExpense(userDetails.getOrganizationId(), id)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        expenseService.deleteExpense(userDetails.getOrganizationId(), id);
        return ResponseEntity.ok(ApiResponse.success("Expense deleted successfully", null));
    }

    @GetMapping("/{id}/attachment")
    public ResponseEntity<byte[]> downloadAttachment(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        ExpenseService.AttachmentData attachment =
                expenseService.getAttachment(userDetails.getOrganizationId(), id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, si.plaan.util.DownloadHeaders.contentDisposition(attachment.fileName()))
                .contentType(MediaType.parseMediaType(attachment.contentType()))
                .contentLength(attachment.bytes().length)
                .body(attachment.bytes());
    }
}
