package si.plaan.dto.response;

public record MaterialConsumptionTotalsResponse(
    long productionOrders,
    long uniqueMaterials,
    long unreconciledLines
) {}
