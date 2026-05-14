package com.gofast.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SignUpResponse {
    private Boolean success;
    private String message;
    private String userId;
    private String token;
    private UserDto user;
}
