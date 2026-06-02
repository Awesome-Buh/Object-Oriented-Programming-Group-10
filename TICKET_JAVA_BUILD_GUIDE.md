# Building the Ticket Generation Functionality in Java (Spring Boot)

Once a user has successfully paid, they expect a ticket. **The frontend ticket page displays the ticket UI, but the backend is responsible for fetching the official booking details and ensuring only the rightful owner can view their ticket.**

Here is the breakdown of responsibilities:

### What the Frontend (`Ticket.js`) does:
1. Requests the ticket data from the backend using the current booking ID.
2. Displays the ticket information (Origin, Destination, Seat, Time, QR Code data).
3. Optionally uses frontend libraries to render a visual QR code or download a PDF.

### What the Backend (Java/Spring Boot) does:
1. **Verification**: Ensures the user requesting the ticket is the user who made the booking.
2. **Status Check**: Ensures the booking status is `PAID` or `CONFIRMED`. If it's still `DRAFT`, it rejects the request.
3. **Data Retrieval**: Returns all necessary details for the frontend to render the ticket.
4. **(Optional) QR/PDF Generation**: You can generate QR codes or PDFs directly in Java and send them to the frontend.

---

## Step 1: Create the Ticket DTO

This object will carry all the data needed by the frontend to display the ticket.

```java
package com.gofast.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Data
public class TicketResponse {
    private UUID bookingId;
    private String passengerName;
    private String origin;
    private String destination;
    private LocalDate departureDate;
    private LocalTime departureTime;
    private String busName;
    private Integer seatNumber;
    private String status;
    private String qrCodeData; // A string that the frontend can turn into a QR image
}
```

---

## Step 2: Create the Ticket Service

This service fetches the booking, verifies ownership and payment, and constructs the response.

```java
package com.gofast.service;

import com.gofast.dto.TicketResponse;
import com.gofast.entity.Booking;
import com.gofast.entity.User;
import com.gofast.repository.BookingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class TicketService {

    @Autowired
    private BookingRepository bookingRepository;

    public TicketResponse getTicketDetails(UUID bookingId, User currentUser) {
        
        // 1. Fetch the booking
        Booking booking = bookingRepository.findById(bookingId)
            .orElseThrow(() -> new RuntimeException("Booking not found."));

        // 2. Verify Ownership
        if (!booking.getUser().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Unauthorized: You do not own this ticket.");
        }

        // 3. Verify Payment Status
        if (!"PAID".equals(booking.getStatus()) && !"CONFIRMED".equals(booking.getStatus())) {
            throw new RuntimeException("Ticket not available. Payment has not been completed.");
        }

        // 4. Construct the Response
        TicketResponse ticket = new TicketResponse();
        ticket.setBookingId(booking.getId());
        ticket.setPassengerName(booking.getPassengerName());
        ticket.setOrigin(booking.getOrigin());
        ticket.setDestination(booking.getDestination());
        ticket.setDepartureDate(booking.getDepartureDate());
        ticket.setDepartureTime(booking.getDepartureTime());
        ticket.setBusName(booking.getBus().getName());
        ticket.setSeatNumber(booking.getSeatNumber());
        ticket.setStatus(booking.getStatus());
        
        // Generate a string that represents the QR code. The frontend will render it.
        ticket.setQrCodeData("GOFAST-TKT-" + booking.getId() + "-" + booking.getSeatNumber());

        return ticket;
    }
}
```

---

## Step 3: Create the Ticket Controller

Expose the endpoint to fetch the ticket.

```java
package com.gofast.controller;

import com.gofast.dto.TicketResponse;
import com.gofast.entity.User;
import com.gofast.service.TicketService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/tickets")
@CrossOrigin(origins = "*")
public class TicketController {

    @Autowired
    private TicketService ticketService;

    @GetMapping("/{bookingId}")
    public ResponseEntity<?> getTicket(@PathVariable UUID bookingId) {
        try {
            // Note: In a real app, you get the 'User' from the JWT Security Context
            User currentUser = new User(); // Replace with actual authenticated user
            
            TicketResponse ticket = ticketService.getTicketDetails(bookingId, currentUser);
            return ResponseEntity.ok(ticket);
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
```

---

## How to hook it into the Frontend (`Ticket.js`)

When the user lands on `ticket.html`, your JavaScript should fetch the ticket details and populate the DOM.

```javascript
async function loadTicket() {
    // Assuming the booking ID is in the URL (e.g., ticket.html?id=123) 
    // or stored in localStorage after payment.
    const urlParams = new URLSearchParams(window.location.search);
    let bookingId = urlParams.get('id');
    
    if (!bookingId) {
        bookingId = localStorage.getItem("currentBookingId");
    }

    if (!bookingId) {
        alert("No ticket found!");
        window.location.href = "home.html";
        return;
    }

    try {
        const response = await fetch(`http://localhost:5500/api/tickets/${bookingId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            }
        });
        
        const result = await response.json();

        if (response.ok) {
            // Populate the UI
            document.getElementById('passengerName').innerText = result.passengerName;
            document.getElementById('routeText').innerText = `${result.origin} to ${result.destination}`;
            document.getElementById('seatNumber').innerText = `Seat: ${result.seatNumber}`;
            document.getElementById('departureInfo').innerText = `${result.departureDate} at ${result.departureTime}`;
            
            // Render QR Code using a frontend library (like qrcode.js)
            // new QRCode(document.getElementById("qrcode"), result.qrCodeData);
        } else {
            alert("Error loading ticket: " + result); // e.g., "Unauthorized" or "Payment not completed"
        }
    } catch (error) {
        console.error("Network error");
    }
}

// Call this when the page loads
window.onload = loadTicket;
```
