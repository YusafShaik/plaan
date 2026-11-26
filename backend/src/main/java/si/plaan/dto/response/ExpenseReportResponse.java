package si.plaan.dto.response;

import java.time.LocalDate;
import java.util.List;

public record ExpenseReportResponse(
    String currency,
    LocalDate fromDate,
    LocalDate toDate,
    ExpenseReportTotalsResponse summary,
    List<ExpenseReportCategoryBreakdownResponse> byCategory,
    List<ExpenseReportPaymentBreakdownResponse> byPaymentMethod,
    PageResponse<ExpenseReportRowResponse> expenses
) {}
