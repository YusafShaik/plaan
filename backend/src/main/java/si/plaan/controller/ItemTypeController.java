package si.plaan.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import si.plaan.dto.request.ItemTypeRequest;
import si.plaan.dto.response.ApiResponse;
import si.plaan.dto.response.ItemTypeResponse;
import si.plaan.security.CustomUserDetails;
import si.plaan.service.ItemTypeService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/master-data/item-types")
@RequiredArgsConstructor
public class ItemTypeController {

    private final ItemTypeService itemTypeService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ItemTypeResponse>>> getItemTypes(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        List<ItemTypeResponse> types = itemTypeService.getItemTypes(userDetails.getOrganizationId());
        return ResponseEntity.ok(ApiResponse.success(types));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ItemTypeResponse>> createItemType(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody ItemTypeRequest request) {
        ItemTypeResponse response = itemTypeService.createItemType(userDetails.getOrganizationId(), request);
        return ResponseEntity.ok(ApiResponse.success("Item type created successfully", response));
    }
}
