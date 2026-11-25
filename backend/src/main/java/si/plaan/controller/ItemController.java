package si.plaan.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import si.plaan.dto.request.CreateItemRequest;
import si.plaan.dto.request.UpdateItemRequest;
import si.plaan.dto.response.ApiResponse;
import si.plaan.dto.response.ItemResponse;
import si.plaan.dto.response.ItemSummaryResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.security.CustomUserDetails;
import si.plaan.service.ItemService;

@RestController
@RequestMapping("/api/v1/master-data/items")
@RequiredArgsConstructor
public class ItemController {

    private final ItemService itemService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ItemResponse>>> getItems(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long typeId,
            @RequestParam(required = false) Boolean active,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {

        Sort sort = "asc".equalsIgnoreCase(direction) ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), sort);

        PageResponse<ItemResponse> response = itemService.getItems(
                userDetails.getOrganizationId(),
                search,
                typeId,
                active,
                pageable
        );

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<ItemSummaryResponse>> getSummary(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        ItemSummaryResponse summary = itemService.getSummary(userDetails.getOrganizationId());
        return ResponseEntity.ok(ApiResponse.success(summary));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ItemResponse>> createItem(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CreateItemRequest request) {
        ItemResponse response = itemService.createItem(userDetails.getOrganizationId(), request);
        return ResponseEntity.ok(ApiResponse.success("Item created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ItemResponse>> updateItem(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody UpdateItemRequest request) {
        ItemResponse response = itemService.updateItem(userDetails.getOrganizationId(), id, request);
        return ResponseEntity.ok(ApiResponse.success("Item updated successfully", response));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<ItemResponse>> toggleStatus(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        ItemResponse response = itemService.toggleStatus(userDetails.getOrganizationId(), id);
        return ResponseEntity.ok(ApiResponse.success("Item status updated successfully", response));
    }
}
