package com.gofast.service;

import com.gofast.dto.*;
import com.gofast.entity.User;
import com.gofast.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@Slf4j
public class AuthService {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private PasswordEncoderService passwordEncoderService;
    
    @Autowired
    private JwtTokenProvider jwtTokenProvider;
    
    @Autowired
    private TokenBlacklistService tokenBlacklistService;
    
    /**
     * Sign up a new user
     */
    @Transactional
    public SignUpResponse signUp(SignUpRequest request) {
        log.info("Processing signup for email: {}", request.getEmail());
        
        try {
            // Check if email already exists
            if (userRepository.existsByEmail(request.getEmail())) {
                log.warn("Signup failed: Email already exists - {}", request.getEmail());
                return SignUpResponse.builder()
                        .success(false)
                        .message("Email already registered")
                        .build();
            }
            
            // Encode password
            String hashedPassword = passwordEncoderService.encodePassword(request.getPassword());
            
            // Create new user
            User user = User.builder()
                    .fullName(request.getFullName())
                    .email(request.getEmail())
                    .passwordHash(hashedPassword)
                    .phone(request.getPhone())
                    .isActive(true)
                    .build();
            
            // Save user to database
            User savedUser = userRepository.save(user);
            
            // Generate tokens
            String accessToken = jwtTokenProvider.generateAccessToken(savedUser.getId(), savedUser.getEmail());
            String refreshToken = jwtTokenProvider.generateRefreshToken(savedUser.getId(), savedUser.getEmail());
            
            // Store refresh token hash (use SHA-256 to avoid bcrypt length limits)
            String refreshTokenHash = passwordEncoderService.hashToken(refreshToken);
            savedUser.setRefreshTokenHash(refreshTokenHash);
            savedUser.setRefreshTokenExpiry(LocalDateTime.now().plusDays(30));
            userRepository.save(savedUser);
            
            // Build response
            UserDto userDto = UserDto.builder()
                    .id(savedUser.getId())
                    .name(savedUser.getFullName())
                    .email(savedUser.getEmail())
                    .phone(savedUser.getPhone())
                    .build();
            
            log.info("User successfully signed up: {}", savedUser.getEmail());
            
            return SignUpResponse.builder()
                    .success(true)
                    .message("Account created successfully")
                    .userId(savedUser.getId())
                    .token(accessToken)
                    .user(userDto)
                    .build();
            
        } catch (Exception e) {
            log.error("Error during signup: {}", e.getMessage());
            return SignUpResponse.builder()
                    .success(false)
                    .message("Signup failed: " + e.getMessage())
                    .build();
        }
    }
    
    /**
     * Login user
     */
    @Transactional
    public LoginResponse login(LoginRequest request) {
        log.info("Attempting login for email: {}", request.getEmail());
        
        try {
            Optional<User> userOptional = userRepository.findByEmail(request.getEmail());
            
            if (userOptional.isEmpty()) {
                log.warn("Login failed: Email not found - {}", request.getEmail());
                return LoginResponse.builder()
                        .success(false)
                        .message("Invalid credentials")
                        .build();
            }
            
            User user = userOptional.get();
            
            // Check if account is active
            if (!user.getIsActive()) {
                log.warn("Login failed: Account inactive for user - {}", user.getEmail());
                return LoginResponse.builder()
                        .success(false)
                        .message("Account suspended")
                        .build();
            }
            
            // Compare passwords
            if (!passwordEncoderService.matches(request.getPassword(), user.getPasswordHash())) {
                log.warn("Login failed: Invalid password for user - {}", request.getEmail());
                return LoginResponse.builder()
                        .success(false)
                        .message("Invalid credentials")
                        .build();
            }
            
            // Generate tokens
            String accessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail());
            String refreshToken = jwtTokenProvider.generateRefreshToken(user.getId(), user.getEmail());
            
            // Update user
            user.setLastLogin(LocalDateTime.now());
            String refreshTokenHash = passwordEncoderService.hashToken(refreshToken);
            user.setRefreshTokenHash(refreshTokenHash);
            user.setRefreshTokenExpiry(LocalDateTime.now().plusDays(30));
            userRepository.save(user);
            
            log.info("User successfully logged in: {}", user.getEmail());
            
            UserDto userDto = UserDto.builder()
                    .id(user.getId())
                    .name(user.getFullName())
                    .email(user.getEmail())
                    .phone(user.getPhone())
                    .build();
            
            return LoginResponse.builder()
                    .success(true)
                    .message("Login successful")
                    .token(accessToken)
                    .refreshToken(refreshToken)
                    .user(userDto)
                    .build();
            
        } catch (Exception e) {
            log.error("Error during login: {}", e.getMessage());
            return LoginResponse.builder()
                    .success(false)
                    .message("Login failed: " + e.getMessage())
                    .build();
        }
    }
    
    /**
     * Logout user
     */
    @Transactional
    public LogoutResponse logout(String token) {
        log.info("Processing logout request");
        
        try {
            String userId = jwtTokenProvider.getUserIdFromToken(token);
            
            if (userId == null || !jwtTokenProvider.validateToken(token)) {
                log.error("Logout failed: Invalid token");
                return LogoutResponse.builder()
                        .success(false)
                        .message("Invalid token")
                        .build();
            }
            
            tokenBlacklistService.blacklistToken(token);
            
            log.info("User successfully logged out: {}", userId);
            
            return LogoutResponse.builder()
                    .success(true)
                    .message("Logged out successfully")
                    .build();
            
        } catch (Exception e) {
            log.error("Error during logout: {}", e.getMessage());
            return LogoutResponse.builder()
                    .success(false)
                    .message("Logout failed: " + e.getMessage())
                    .build();
        }
    }
    
    /**
     * Refresh token
     */
    @Transactional
    public TokenRefreshResponse refreshToken(TokenRefreshRequest request) {
        log.info("Processing token refresh request");
        
        try {
            String refreshToken = request.getRefreshToken();
            
            if (!jwtTokenProvider.validateToken(refreshToken)) {
                log.warn("Token refresh failed: Invalid or expired refresh token");
                return TokenRefreshResponse.builder()
                        .success(false)
                        .message("Invalid or expired refresh token")
                        .build();
            }
            
            String userId = jwtTokenProvider.getUserIdFromToken(refreshToken);
            
            if (userId == null) {
                log.error("Token refresh failed: Cannot extract user ID from refresh token");
                return TokenRefreshResponse.builder()
                        .success(false)
                        .message("Invalid refresh token")
                        .build();
            }
            
            Optional<User> userOptional = userRepository.findById(userId);
            
            if (userOptional.isEmpty()) {
                log.error("Token refresh failed: User not found for ID: {}", userId);
                return TokenRefreshResponse.builder()
                        .success(false)
                        .message("User not found")
                        .build();
            }
            
            User user = userOptional.get();
            
            // Verify refresh token hash
            if (user.getRefreshTokenHash() == null || 
                !passwordEncoderService.matchesToken(refreshToken, user.getRefreshTokenHash())) {
                log.warn("Token refresh failed: Refresh token hash mismatch for user: {}", userId);
                return TokenRefreshResponse.builder()
                        .success(false)
                        .message("Invalid refresh token")
                        .build();
            }
            
            // Check if refresh token expired
            if (user.getRefreshTokenExpiry() != null && 
                user.getRefreshTokenExpiry().isBefore(LocalDateTime.now())) {
                log.warn("Token refresh failed: Refresh token expired for user: {}", userId);
                return TokenRefreshResponse.builder()
                        .success(false)
                        .message("Refresh token expired")
                        .build();
            }
            
            // Check if token is blacklisted
            if (tokenBlacklistService.isTokenBlacklisted(refreshToken, userId)) {
                log.warn("Token refresh failed: Refresh token is blacklisted for user: {}", userId);
                return TokenRefreshResponse.builder()
                        .success(false)
                        .message("Refresh token has been revoked")
                        .build();
            }
            
            // Generate new tokens
            String newAccessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail());
            String newRefreshToken = jwtTokenProvider.generateRefreshToken(user.getId(), user.getEmail());
            
            // Update user
            String newRefreshTokenHash = passwordEncoderService.encodePassword(newRefreshToken);
            user.setRefreshTokenHash(newRefreshTokenHash);
            user.setRefreshTokenExpiry(LocalDateTime.now().plusDays(30));
            userRepository.save(user);
            
            log.info("Token refresh successful for user: {}", userId);
            
            return TokenRefreshResponse.builder()
                    .success(true)
                    .message("Tokens refreshed successfully")
                    .accessToken(newAccessToken)
                    .refreshToken(newRefreshToken)
                    .build();
            
        } catch (Exception e) {
            log.error("Error during token refresh: {}", e.getMessage());
            return TokenRefreshResponse.builder()
                    .success(false)
                    .message("Token refresh failed: " + e.getMessage())
                    .build();
        }
    }
}
