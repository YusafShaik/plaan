package si.plaan.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.request.CreateOrganizationRequest;
import si.plaan.dto.request.UpdateOrganizationStatusRequest;
import si.plaan.dto.response.OrganizationResponse;
import si.plaan.entity.Organization;
import si.plaan.entity.Role;
import si.plaan.entity.User;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.OrganizationRepository;
import si.plaan.repository.UserRepository;
import si.plaan.service.PlatformOrganizationService;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PlatformOrganizationServiceImpl implements PlatformOrganizationService {

    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public List<OrganizationResponse> getAllOrganizations() {
        List<Organization> orgs = organizationRepository.findAll().stream()
                .filter(org -> !"plaan-platform".equals(org.getSlug()))
                .toList();

        if (orgs.isEmpty()) {
            return List.of();
        }

        // Batch query to eliminate N+1 database roundtrips
        List<Long> orgIds = orgs.stream().map(Organization::getId).toList();
        List<User> admins = userRepository.findByOrganizationIdInAndRoleIn(
                orgIds,
                List.of(Role.ROLE_ORG_ADMIN, Role.ROLE_ADMIN)
        );

        Map<Long, User> adminMap = admins.stream()
                .collect(Collectors.toMap(
                        u -> u.getOrganization().getId(),
                        u -> u,
                        (existing, replacement) -> existing
                ));

        return orgs.stream()
                .map(org -> {
                    User admin = adminMap.get(org.getId());
                    return new OrganizationResponse(
                            org.getId(),
                            org.getName(),
                            org.getSlug(),
                            org.getCountry(),
                            org.getBaseCurrency(),
                            org.getTimeZone(),
                            org.isActive(),
                            admin != null ? admin.getFullName() : "Unassigned",
                            admin != null ? admin.getEmail() : "N/A",
                            org.getCreatedAt()
                    );
                })
                .toList();
    }

    @Override
    @Transactional
    public OrganizationResponse createOrganization(CreateOrganizationRequest request) {
        log.info("Creating new customer workspace for: {}", request.organizationName());

        if (userRepository.existsByEmail(request.adminEmail())) {
            throw new IllegalArgumentException("Administrator email is already registered");
        }

        String slug = generateSlug(request.organizationName());

        Organization organization = Organization.builder()
                .name(request.organizationName().trim())
                .slug(slug)
                .country(request.country().trim())
                .baseCurrency(request.baseCurrency().trim())
                .timeZone(request.timeZone().trim())
                .active(true)
                .build();

        Organization savedOrg = organizationRepository.saveAndFlush(organization);

        // Provision secure temporary initial credentials
        String temporaryPassword = "Plaan-" + UUID.randomUUID().toString().substring(0, 8) + "!";
        User adminUser = User.builder()
                .organization(savedOrg)
                .email(request.adminEmail().trim().toLowerCase())
                .passwordHash(passwordEncoder.encode(temporaryPassword))
                .fullName(request.adminFullName().trim())
                .role(Role.ROLE_ORG_ADMIN)
                .active(true)
                .build();

        userRepository.save(adminUser);

        log.info("Created organization {} (slug: {}) with admin {} (temp password provisioned)", 
                savedOrg.getName(), savedOrg.getSlug(), adminUser.getEmail());

        return new OrganizationResponse(
                savedOrg.getId(),
                savedOrg.getName(),
                savedOrg.getSlug(),
                savedOrg.getCountry(),
                savedOrg.getBaseCurrency(),
                savedOrg.getTimeZone(),
                savedOrg.isActive(),
                adminUser.getFullName(),
                adminUser.getEmail(),
                savedOrg.getCreatedAt()
        );
    }

    @Override
    @Transactional
    public OrganizationResponse updateOrganizationStatus(Long id, UpdateOrganizationStatusRequest request) {
        Organization organization = organizationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found with id: " + id));

        organization.setActive(request.active());
        Organization updated = organizationRepository.save(organization);
        log.info("Updated organization {} (id: {}) active status to: {}", updated.getName(), id, updated.isActive());

        User admin = userRepository.findFirstByOrganizationIdAndRoleIn(
                updated.getId(),
                List.of(Role.ROLE_ORG_ADMIN, Role.ROLE_ADMIN)
        ).orElse(null);

        return new OrganizationResponse(
                updated.getId(),
                updated.getName(),
                updated.getSlug(),
                updated.getCountry(),
                updated.getBaseCurrency(),
                updated.getTimeZone(),
                updated.isActive(),
                admin != null ? admin.getFullName() : "Unassigned",
                admin != null ? admin.getEmail() : "N/A",
                updated.getCreatedAt()
        );
    }

    private String generateSlug(String name) {
        String base = name.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("^-+|-+$", "");
        if (base.isBlank()) {
            base = "org";
        }
        String candidate = base;
        int counter = 1;
        while (organizationRepository.existsBySlug(candidate)) {
            candidate = base + "-" + counter;
            counter++;
            if (counter > 100) {
                candidate = base + "-" + UUID.randomUUID().toString().substring(0, 6);
                break;
            }
        }
        return candidate;
    }
}
