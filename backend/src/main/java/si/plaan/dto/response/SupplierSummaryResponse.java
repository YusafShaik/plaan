package si.plaan.dto.response;

public record SupplierSummaryResponse(
    long totalSuppliers,
    long activeSuppliers,
    long inactiveSuppliers
) {}
