package com.gofast.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoginResponse {
    private Boolean success;
    private String message;
    private String token;
    private String refreshToken;
    private UserDto user;
}
