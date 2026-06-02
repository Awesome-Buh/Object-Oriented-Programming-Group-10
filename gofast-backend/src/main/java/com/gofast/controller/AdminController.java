package com.gofast.controller;

import com.gofast.dto.AdminBookingDto;
import com.gofast.dto.AdminUserDto;
import com.gofast.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class AdminController {
    private final AdminService adminService;

    @GetMapping("/bookings/paid")
    public ResponseEntity<List<AdminBookingDto>> getPaidBookings() {
        return ResponseEntity.ok(adminService.getPaidBookings());
    }

    @GetMapping("/users")
    public ResponseEntity<List<AdminUserDto>> getAllUsers() {
        return ResponseEntity.ok(adminService.getAllUsers());
    }

    @PutMapping("/users/{id}/active")
    public ResponseEntity<AdminUserDto> setUserActive(@PathVariable("id") String id,
                                                      @RequestParam("active") Boolean active) {
        return ResponseEntity.ok(adminService.setUserActive(id, active));
    }
}
