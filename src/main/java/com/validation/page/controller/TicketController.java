package com.validation.page.controller;

// import com.validation.page.dataTransferObject.TicketRespondDTO;
import com.validation.page.dataTransferObject.TicketRespondDTO;
import com.validation.page.service.TicketService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tickets")
@CrossOrigin(origins = "http://localhost:3000")

public class TicketController {

    @Autowired
    private TicketService ticketService;

    @GetMapping("/bookings")
    public ResponseEntity<List<TicketRespondDTO>> loadAllBookings() {
        List<TicketRespondDTO> bookings = ticketService.getAllConfirmedBookings();
        return ResponseEntity.ok(bookings);
    }
}
