package com.gofast.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminUserDto {
    private String id;
    private String fullName;
    private String email;
    private String phone;
    private Boolean isActive;
}
