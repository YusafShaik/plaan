package si.plaan.service.support;

import java.util.Locale;

/** Shared stock movement classification used by Stock Ledger and Stock Movements report. */
public final class StockMovementSupport {

    public static final String FILTER_OPENING_STOCK = "OPENING_STOCK";
    public static final String FILTER_GOODS_RECEIPT = "GOODS_RECEIPT";
    public static final String FILTER_TRANSFER_IN = "TRANSFER_IN";
    public static final String FILTER_TRANSFER_OUT = "TRANSFER_OUT";
    public static final String FILTER_ADJUSTMENT = "ADJUSTMENT";
    public static final String FILTER_MATERIAL_ISSUE = "MATERIAL_ISSUE";
    public static final String FILTER_MATERIAL_RETURN = "MATERIAL_RETURN";
    public static final String FILTER_PRODUCTION_RECEIPT = "PRODUCTION_RECEIPT";
    public static final String FILTER_SALES_DISPATCH = "SALES_DISPATCH";

    private StockMovementSupport() {}

    public static boolean isIncoming(String movementType) {
        if (movementType == null) return true;
        String type = movementType.toUpperCase(Locale.ROOT);
        return type.startsWith("INBOUND")
                || type.equals("OPENING_STOCK")
                || type.equals("TRANSFER_IN")
                || type.equals("ADJUSTMENT_IN")
                || type.equals("MATERIAL_RETURN")
                || type.contains("RETURN")
                || type.equals("PRODUCTION_RECEIPT");
    }

    public static String displayLabel(String movementType) {
        if (movementType == null) return "Purchase Receipt";
        String type = movementType.toUpperCase(Locale.ROOT);
        if (type.equals("OPENING_STOCK")) return "Opening Stock";
        if (type.equals("TRANSFER_IN")) return "Transfer In";
        if (type.equals("TRANSFER_OUT")) return "Transfer Out";
        if (type.contains("TRANSFER")) return "Stock Transfer";
        if (type.equals("ADJUSTMENT_IN") || type.equals("ADJUSTMENT_OUT") || type.contains("ADJUSTMENT")) {
            return "Stock Adjustment";
        }
        if (type.contains("ISSUE")) return "Material Issue";
        if (type.contains("RETURN")) return "Material Return";
        if (type.equals("PRODUCTION_RECEIPT")) return "Production Receipt";
        if (type.equals("SALES_DISPATCH") || type.contains("DISPATCH")) return "Sales Dispatch";
        if (type.startsWith("INBOUND") || type.contains("RECEIPT")) return "Goods Receipt";
        return "Purchase Receipt";
    }

    public static String filterKey(String movementType) {
        if (movementType == null) return FILTER_GOODS_RECEIPT;
        String type = movementType.toUpperCase(Locale.ROOT);
        if (type.equals("OPENING_STOCK")) return FILTER_OPENING_STOCK;
        if (type.equals("TRANSFER_IN")) return FILTER_TRANSFER_IN;
        if (type.equals("TRANSFER_OUT")) return FILTER_TRANSFER_OUT;
        if (type.contains("TRANSFER")) return type.contains("OUT") ? FILTER_TRANSFER_OUT : FILTER_TRANSFER_IN;
        if (type.contains("ADJUSTMENT")) return FILTER_ADJUSTMENT;
        if (type.contains("ISSUE")) return FILTER_MATERIAL_ISSUE;
        if (type.contains("RETURN")) return FILTER_MATERIAL_RETURN;
        if (type.equals("PRODUCTION_RECEIPT")) return FILTER_PRODUCTION_RECEIPT;
        if (type.equals("SALES_DISPATCH") || type.contains("DISPATCH")) return FILTER_SALES_DISPATCH;
        return FILTER_GOODS_RECEIPT;
    }

    public static boolean matchesFilter(String movementType, String filter) {
        if (filter == null || filter.isBlank()) return true;
        return filterKey(movementType).equals(filter.trim().toUpperCase(Locale.ROOT));
    }
}
