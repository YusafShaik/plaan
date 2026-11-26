package si.plaan.dto.response;

import java.util.List;

public record RejectionReportResponse(
    RejectionReportTotalsResponse summary,
    PageResponse<RejectionReportRowResponse> rejections,
    List<RejectionReportRowResponse> remarks
) {}
