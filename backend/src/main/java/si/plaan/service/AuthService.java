package si.plaan.service;

import si.plaan.dto.request.LoginRequest;
import si.plaan.dto.response.AuthResponse;
import si.plaan.dto.response.UserSummaryResponse;

public interface AuthService {
    AuthResponse login(LoginRequest request);
    UserSummaryResponse getCurrentUser(Long userId);
}
