package si.plaan.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import si.plaan.dto.request.LoginRequest;
import si.plaan.dto.response.AuthResponse;
import si.plaan.dto.response.OrganizationSummaryResponse;
import si.plaan.dto.response.UserSummaryResponse;
import si.plaan.entity.Organization;
import si.plaan.entity.User;
import si.plaan.exception.ResourceNotFoundException;
import si.plaan.repository.UserRepository;
import si.plaan.security.CustomUserDetails;
import si.plaan.security.JwtTokenProvider;
import si.plaan.service.AuthService;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        log.info("Attempting login for email: {}", request.email());

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        String token = tokenProvider.generateToken(userDetails);

        User user = userRepository.findByEmailWithOrganization(userDetails.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + userDetails.getEmail()));

        Organization organization = user.getOrganization();

        UserSummaryResponse userSummary = new UserSummaryResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                organization.getId()
        );

        OrganizationSummaryResponse orgSummary = new OrganizationSummaryResponse(
                organization.getId(),
                organization.getName(),
                organization.getSlug()
        );

        log.info("User {} logged in successfully for organization {}", user.getEmail(), organization.getSlug());

        return new AuthResponse(
                token,
                "Bearer",
                tokenProvider.getExpirationMs(),
                userSummary,
                orgSummary
        );
    }

    @Override
    @Transactional(readOnly = true)
    public UserSummaryResponse getCurrentUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        return new UserSummaryResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.getOrganization().getId()
        );
    }
}
