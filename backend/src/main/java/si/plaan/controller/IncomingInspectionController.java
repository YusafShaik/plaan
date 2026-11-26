package si.plaan.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import si.plaan.dto.request.UpdateIncomingInspectionRequest;
import si.plaan.dto.response.ApiResponse;
import si.plaan.dto.response.IncomingInspectionResponse;
import si.plaan.dto.response.PageResponse;
import si.plaan.entity.IncomingInspectionStatus;
import si.plaan.security.CustomUserDetails;
import si.plaan.service.IncomingInspectionService;

@RestController
@RequestMapping("/api/v1/quality/incoming-inspections")
@RequiredArgsConstructor
public class IncomingInspectionController {

    private final IncomingInspectionService incomingInspectionService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<IncomingInspectionResponse>>> list(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) IncomingInspectionStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {

        Sort sort = "asc".equalsIgnoreCase(direction) ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), sort);

        return ResponseEntity.ok(ApiResponse.success(incomingInspectionService.getInspections(
                userDetails.getOrganizationId(), search, status, pageable)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<IncomingInspectionResponse>> getById(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                incomingInspectionService.getById(userDetails.getOrganizationId(), id)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<IncomingInspectionResponse>> update(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody UpdateIncomingInspectionRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Incoming inspection saved",
                incomingInspectionService.update(
                        userDetails.getOrganizationId(), id, userDetails.getId(), request)));
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<ApiResponse<IncomingInspectionResponse>> complete(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody UpdateIncomingInspectionRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Incoming inspection completed",
                incomingInspectionService.complete(
                        userDetails.getOrganizationId(), id, userDetails.getId(), request)));
    }
}
