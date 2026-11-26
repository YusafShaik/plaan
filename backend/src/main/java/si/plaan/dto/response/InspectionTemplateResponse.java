package si.plaan.dto.response;

import si.plaan.entity.InspectionTemplateStatus;
import si.plaan.entity.InspectionType;

import java.time.LocalDateTime;
import java.util.List;

public record InspectionTemplateResponse(
    Long id,
    String templateCode,
    String templateName,
    Long itemId,
    String itemCode,
    String itemName,
    InspectionType inspectionType,
    InspectionTemplateStatus status,
    String notes,
    int parametersCount,
    List<InspectionTemplateParameterResponse> parameters,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
