package si.plaan.dto.response;

public record DashboardAttentionResponse(
        long overduePurchaseOrders,
        long overdueCustomerDispatches,
        long productionOrdersWithMaterialShortage,
        long pendingQualityInspections,
        long overdueCustomerInvoices,
        long overdueSupplierInvoices,
        long overdueMaintenancePlans,
        long equipmentBreakdowns
) {}
