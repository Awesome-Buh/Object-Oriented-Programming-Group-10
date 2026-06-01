package com.gofast.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class TokenBlacklistService {
    
    @Autowired
    private RedisTemplate<String, String> redisTemplate;
    
    @Autowired
    private JwtTokenProvider jwtTokenProvider;
    
    /**
     * Add token to blacklist with TTL equal to token expiration
     */
    public void blacklistToken(String token) {
        try {
            String userId = jwtTokenProvider.getUserIdFromToken(token);
            Date expirationDate = jwtTokenProvider.getExpirationDateFromToken(token);
            
            if (userId == null || expirationDate == null) {
                log.error("Cannot blacklist token: Invalid token structure");
                return;
            }
            
            long now = System.currentTimeMillis();
            long expirationTime = expirationDate.getTime();
            long remainingTime = expirationTime - now;
            
            if (remainingTime <= 0) {
                log.warn("Token already expired, no need to blacklist");
                return;
            }
            
            String blacklistKey = "blacklist:" + userId + ":" + token.substring(0, 10);
            redisTemplate.opsForValue().set(
                    blacklistKey, 
                    "true", 
                    remainingTime, 
                    TimeUnit.MILLISECONDS
            );
            
            log.info("Token blacklisted for user: {}", userId);
            
        } catch (Exception e) {
            log.error("Error blacklisting token: {}", e.getMessage());
        }
    }
    
    /**
     * Check if token is blacklisted
     */
    public Boolean isTokenBlacklisted(String token, String userId) {
        try {
            String blacklistKey = "blacklist:" + userId + ":" + token.substring(0, 10);
            Boolean exists = redisTemplate.hasKey(blacklistKey);
            return exists != null && exists;
        } catch (Exception e) {
            log.error("Error checking token blacklist: {}", e.getMessage());
            return false;
        }
    }
}
