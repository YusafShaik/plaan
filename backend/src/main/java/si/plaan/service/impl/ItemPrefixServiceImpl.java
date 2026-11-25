package si.plaan.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.request.CreateItemPrefixRequest;
import si.plaan.dto.response.ItemPrefixResponse;
import si.plaan.entity.ItemPrefix;
import si.plaan.entity.Organization;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.ItemPrefixRepository;
import si.plaan.repository.OrganizationRepository;
import si.plaan.service.ItemPrefixService;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class ItemPrefixServiceImpl implements ItemPrefixService {

    private final ItemPrefixRepository itemPrefixRepository;
    private final OrganizationRepository organizationRepository;

    private static final Pattern CODE_NUMBER_PATTERN = Pattern.compile("(\\d+)$");

    @Override
    @Transactional(readOnly = true)
    public List<ItemPrefixResponse> getPrefixes(Long orgId) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }
        return itemPrefixRepository.findByOrganizationIdOrderByPrefixAsc(orgId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    @Transactional
    public ItemPrefixResponse createPrefix(Long orgId, CreateItemPrefixRequest request) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        String prefixStr = request.prefix().trim().toUpperCase();
        if (itemPrefixRepository.existsByOrganizationIdAndPrefixIgnoreCase(orgId, prefixStr)) {
            throw new IllegalArgumentException("Prefix '" + prefixStr + "' already exists in this organization");
        }

        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with id: " + orgId));

        long initialNum = request.initialNumber() != null ? Math.max(0, request.initialNumber()) : 0L;
        int padding = request.paddingDigits() != null ? Math.max(1, request.paddingDigits()) : 3;

        ItemPrefix itemPrefix = ItemPrefix.builder()
                .organization(org)
                .prefix(prefixStr)
                .description(request.description() != null ? request.description().trim() : null)
                .lastNumber(initialNum)
                .paddingDigits(padding)
                .build();

        ItemPrefix saved = itemPrefixRepository.save(itemPrefix);
        log.info("Created item prefix '{}' with lastNumber {} for org id {}", saved.getPrefix(), saved.getLastNumber(), orgId);

        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public ItemPrefixResponse getNextCode(Long orgId, Long prefixId) {
        if (orgId == null) {
            throw new AccessDeniedException("Organization context required");
        }

        ItemPrefix prefix = itemPrefixRepository.findByIdAndOrganizationId(prefixId, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Item prefix not found with id: " + prefixId));

        return mapToResponse(prefix);
    }

    @Override
    @Transactional
    public void recordCodeUsage(Long orgId, Long prefixId, String newPrefix, String itemCode) {
        if (orgId == null || itemCode == null || itemCode.isBlank()) {
            return;
        }

        ItemPrefix targetPrefix = null;
        if (prefixId != null) {
            targetPrefix = itemPrefixRepository.findByIdAndOrganizationId(prefixId, orgId).orElse(null);
        }

        if (targetPrefix == null && newPrefix != null && !newPrefix.isBlank()) {
            String pStr = newPrefix.trim().toUpperCase();
            targetPrefix = itemPrefixRepository.findByOrganizationIdAndPrefixIgnoreCase(orgId, pStr)
                    .orElseGet(() -> {
                        Organization org = organizationRepository.findById(orgId).orElse(null);
                        if (org == null) return null;
                        return itemPrefixRepository.save(
                                ItemPrefix.builder()
                                        .organization(org)
                                        .prefix(pStr)
                                        .lastNumber(0L)
                                        .paddingDigits(3)
                                        .build()
                        );
                    });
        }

        if (targetPrefix == null) {
            // Try to match prefix by parsing itemCode (e.g. ITM-001 -> prefix ITM-)
            for (ItemPrefix p : itemPrefixRepository.findByOrganizationIdOrderByPrefixAsc(orgId)) {
                if (itemCode.toUpperCase().startsWith(p.getPrefix().toUpperCase())) {
                    targetPrefix = p;
                    break;
                }
            }
        }

        if (targetPrefix != null) {
            long extracted = extractNumber(itemCode);
            if (extracted > targetPrefix.getLastNumber()) {
                targetPrefix.setLastNumber(extracted);
                itemPrefixRepository.save(targetPrefix);
                log.info("Advanced prefix '{}' lastNumber to {} for org {}", targetPrefix.getPrefix(), extracted, orgId);
            }
        }
    }

    private long extractNumber(String code) {
        Matcher matcher = CODE_NUMBER_PATTERN.matcher(code.trim());
        if (matcher.find()) {
            try {
                return Long.parseLong(matcher.group(1));
            } catch (NumberFormatException ignored) {}
        }
        return 0L;
    }

    private ItemPrefixResponse mapToResponse(ItemPrefix prefix) {
        return new ItemPrefixResponse(
                prefix.getId(),
                prefix.getPrefix(),
                prefix.getDescription(),
                prefix.getLastNumber(),
                prefix.getPaddingDigits(),
                prefix.getNextCode()
        );
    }
}
