package com.gofast.service;

import com.gofast.dto.AdminBookingDto;
import com.gofast.dto.AdminUserDto;
import com.gofast.entity.Booking;
import com.gofast.entity.User;
import com.gofast.enums.BookingStatus;
import com.gofast.repository.BookingRepository;
import com.gofast.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;

    public List<AdminBookingDto> getPaidBookings() {
        List<Booking> bookings = bookingRepository.findByStatus(BookingStatus.PAID);
        return bookings.stream().map(b -> AdminBookingDto.builder()
                .bookingId(b.getId())
                .fullName(b.getFullName())
                .phone(b.getPhone())
                .origin(b.getOrigin())
                .destination(b.getDestination())
                .departureDate(b.getDepartureDate())
                .departureTime(b.getDepartureTime())
                .selectedSeat(null)
                .price(b.getAmount())
                .build())
            .collect(Collectors.toList());
    }

    public List<AdminUserDto> getAllUsers() {
        return userRepository.findAll().stream().map(u -> AdminUserDto.builder()
                .id(u.getId())
                .fullName(u.getFullName())
                .email(u.getEmail())
                .phone(u.getPhone())
                .isActive(u.getIsActive())
                .build())
            .collect(Collectors.toList());
    }

    public AdminUserDto setUserActive(String userId, Boolean active) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setIsActive(active);
        User saved = userRepository.save(user);
        return AdminUserDto.builder()
                .id(saved.getId())
                .fullName(saved.getFullName())
                .email(saved.getEmail())
                .phone(saved.getPhone())
                .isActive(saved.getIsActive())
                .build();
    }
}
