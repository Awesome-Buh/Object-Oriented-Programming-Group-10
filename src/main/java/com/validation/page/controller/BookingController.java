package com.validation.page.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import com.validation.page.dataTransferObject.TicketBookingRequestDTO;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    @GetMapping
    public ResponseEntity<List<String>> getAllBookings(@Valid @RequestBody TicketBookingRequestDTO ticketBookingRequestDTO) {
        return ResponseEntity.ok(List.of()); //not implemented yet
    }

    @PostMapping
    public ResponseEntity<String> createBooking(@RequestBody String booking) {
        return ResponseEntity.ok("Booking created successfully"); //not implemented yet
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteBooking(@PathVariable Long id) {
        return ResponseEntity.ok("Booking deleted successfully"); //not implemented yet
    }
}
