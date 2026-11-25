package si.plaan.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import si.plaan.dto.request.CreateItemPrefixRequest;
import si.plaan.dto.response.ApiResponse;
import si.plaan.dto.response.ItemPrefixResponse;
import si.plaan.security.CustomUserDetails;
import si.plaan.service.ItemPrefixService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/master-data/item-prefixes")
@RequiredArgsConstructor
public class ItemPrefixController {

    private final ItemPrefixService itemPrefixService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ItemPrefixResponse>>> getPrefixes(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        List<ItemPrefixResponse> prefixes = itemPrefixService.getPrefixes(userDetails.getOrganizationId());
        return ResponseEntity.ok(ApiResponse.success(prefixes));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ItemPrefixResponse>> createPrefix(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CreateItemPrefixRequest request) {
        ItemPrefixResponse response = itemPrefixService.createPrefix(userDetails.getOrganizationId(), request);
        return ResponseEntity.ok(ApiResponse.success("Item prefix created successfully", response));
    }

    @GetMapping("/{id}/next")
    public ResponseEntity<ApiResponse<ItemPrefixResponse>> getNextCode(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
        ItemPrefixResponse response = itemPrefixService.getNextCode(userDetails.getOrganizationId(), id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
