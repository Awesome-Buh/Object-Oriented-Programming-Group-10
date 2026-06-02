package com.gofast.service;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;

@Service
@Slf4j
public class JwtTokenProvider {

    @Value("${app.jwtSecret:mySecretKeyForJWTTokenGenerationAndValidationThatIsAtLeast32CharsLong12345}")
    private String jwtSecret;

    @Value("${app.jwtExpirationMs:3600000}")  // 1 hour
    private long jwtExpirationMs;

    @Value("${app.refreshTokenExpirationMs:2592000000}")  // 30 days
    private long refreshTokenExpirationMs;

    /**
     * Generate Access Token (1 hour expiration)
     */
    public String generateAccessToken(String userId, String email) {
        return generateToken(userId, email, jwtExpirationMs);
    }

    /**
     * Generate Refresh Token (30 day expiration)
     */
    public String generateRefreshToken(String userId, String email) {
        return generateToken(userId, email, refreshTokenExpirationMs);
    }

    /**
     * Generate JWT Token
     */
    private String generateToken(String userId, String email, long expirationMs) {
        try {
            SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes());

            return Jwts.builder()
                    .setSubject(userId)
                    .claim("email", email)
                    .setIssuedAt(new Date())
                    .setExpiration(new Date(System.currentTimeMillis() + expirationMs))
                    .signWith(key, SignatureAlgorithm.HS512)
                    .compact();
        } catch (Exception e) {
            log.error("Error generating JWT token: {}", e.getMessage());
            throw new RuntimeException("Error generating JWT token", e);
        }
    }

    /**
     * Get User ID from token
     */
    /**
     * Get User ID from token
     */
    public String getUserIdFromToken(String token) {
        try {
            SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            var claims = Jwts.parserBuilder()
                    .setSigningKey(key)
                    .build()
                    .parseClaimsJws(token)
                    .getBody();

            return claims.getSubject();
        } catch (Exception e) {
            log.error("Error extracting user ID from token: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Get Expiration Date from token
     */
    /**
     * Get Expiration Date from token
     */
    public Date getExpirationDateFromToken(String token) {
        try {
            SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            var claims = Jwts.parserBuilder()
                    .setSigningKey(key)
                    .build()
                    .parseClaimsJws(token)
                    .getBody();

            return claims.getExpiration();
        } catch (Exception e) {
            log.error("Error extracting expiration date from token: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Validate JWT token
     */
    /**
     * Validate JWT token
     */
    public Boolean validateToken(String token) {
        try {
            SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            Jwts.parserBuilder()
                    .setSigningKey(key)
                    .build()
                    .parseClaimsJws(token);
            return true;
        } catch (io.jsonwebtoken.security.SecurityException e) {
            log.error("Invalid JWT signature: {}", e.getMessage());
        } catch (MalformedJwtException e) {
            log.error("Invalid JWT token: {}", e.getMessage());
        } catch (ExpiredJwtException e) {
            log.error("Expired JWT token: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            log.error("Unsupported JWT token: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            log.error("JWT claims string is empty: {}", e.getMessage());
        }

        return false;
    }
}
