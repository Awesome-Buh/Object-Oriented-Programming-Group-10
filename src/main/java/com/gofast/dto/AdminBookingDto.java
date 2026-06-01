package com.gofast.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminBookingDto {
    private UUID bookingId;
    private String fullName;
    private String phone;
    private String origin;
    private String destination;
    private String departureDate;
    private String departureTime;
    private String selectedSeat;
    private int price;
}
