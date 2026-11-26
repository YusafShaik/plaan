package si.plaan.dto.response;

public record DashboardEquipmentStatusResponse(
        long breakdown,
        long operational,
        long underMaintenance,
        long activeMachines
) {}
