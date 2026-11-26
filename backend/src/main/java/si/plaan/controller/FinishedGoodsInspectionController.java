package si.plaan.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import si.plaan.dto.request.UpdateFinishedGoodsInspectionRequest;
import si.plaan.dto.response.ApiResponse;
import si.plaan.dto.response.FinishedGoodsInspectionResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.entity.FinishedGoodsInspectionStatus;
import si.plaan.security.CustomUserDetails;
import si.plaan.service.FinishedGoodsInspectionService;

@RestController
@RequestMapping("/api/v1/quality/finished-goods-inspections")
@RequiredArgsConstructor
public class FinishedGoodsInspectionController {

    private final FinishedGoodsInspectionService finishedGoodsInspectionService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<FinishedGoodsInspectionResponse>>> list(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) FinishedGoodsInspectionStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {

        Sort sort = "asc".equalsIgnoreCase(direction) ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), sort);

        return ResponseEntity.ok(ApiResponse.success(finishedGoodsInspectionService.getInspections(
                userDetails.getOrganizationId(), search, status, pageable)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<FinishedGoodsInspectionResponse>> getById(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                finishedGoodsInspectionService.getById(userDetails.getOrganizationId(), id)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<FinishedGoodsInspectionResponse>> update(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody UpdateFinishedGoodsInspectionRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Finished goods inspection saved",
                finishedGoodsInspectionService.update(
                        userDetails.getOrganizationId(), id, userDetails.getId(), request)));
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<ApiResponse<FinishedGoodsInspectionResponse>> complete(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody UpdateFinishedGoodsInspectionRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Finished goods inspection completed",
                finishedGoodsInspectionService.complete(
                        userDetails.getOrganizationId(), id, userDetails.getId(), request)));
    }
}
