# Building the Booking Functionality in Java (Spring Boot)

To answer your question: **No, not all the work is done on the booking page.** In a real application, the frontend (the booking page) is simply a "display layer." The backend does all the heavy lifting to ensure data consistency, prevent double-bookings, and handle the actual business logic.

Here is the breakdown of responsibilities:

### What the Frontend (`Booking.js`) does:
1. Collects user input (origin, destination, date, time).
2. Sends a request to the backend to fetch available buses and prices.
3. Displays the bus layout and lets the user click a seat.
4. Sends the final booking request (Draft Booking) to the backend.

### What the Backend (Java/Spring Boot) does:
1. **Data Management**: Queries the database to find actual routes, prices, and buses.
2. **Availability Checks**: Checks the database to see which seats are already booked on a specific date and bus.
3. **Concurrency Control (Seat Locking)**: Crucially, if two users try to click the same seat at the exact same time, the backend uses a "Seat Lock" to ensure only the first person gets it. 
4. **Draft Creation**: Creates a temporary booking record in the database while waiting for the user to pay.

Here is a comprehensive guide on how to build the backend logic for the **"Create Booking"** flow using Java Spring Boot.

---

## Step 1: Create the Database Entities

You need to represent the core concepts in Java classes mapped to database tables using JPA (`@Entity`).

### 1. Route Entity
This stores the origin, destination, and base price.
```java
package com.gofast.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.util.UUID;

@Entity
@Table(name = "routes")
@Data
public class Route {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String origin;
    private String destination;
    private Integer basePrice;
}
```

### 2. Bus Entity
Represents the actual vehicles.
```java
package com.gofast.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.util.UUID;

@Entity
@Table(name = "buses")
@Data
public class Bus {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String name;
    private Integer capacity;
}
```

### 3. Booking Entity
Stores the user's reservation.
```java
package com.gofast.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "bookings")
@Data
public class Booking {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user; // Links to your existing User entity

    private String passengerName;
    private String origin;
    private String destination;
    private LocalDate departureDate;
    private LocalTime departureTime;
    
    @ManyToOne
    @JoinColumn(name = "bus_id")
    private Bus bus;
    
    private Integer seatNumber;
    private Integer totalPrice;
    
    private String status; // "DRAFT", "CONFIRMED", "PAID"
}
```

---

## Step 2: Create the Repositories

Spring Data JPA makes it easy to interact with the database. Create interfaces for your entities.

```java
package com.gofast.repository;

import com.gofast.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface BookingRepository extends JpaRepository<Booking, UUID> {
    // Find all bookings for a specific bus on a specific date to know which seats are taken
    List<Booking> findByBusIdAndDepartureDate(UUID busId, LocalDate departureDate);
    
    // Check if a specific seat is already booked
    boolean existsByBusIdAndDepartureDateAndSeatNumberAndStatusNot(
        UUID busId, LocalDate date, Integer seat, String status
    );
}
```

---

## Step 3: Create the Booking Service

This is where the core business logic happens. When the frontend says "Book seat #5 on Bus 101", the backend must verify it's available.

```java
package com.gofast.service;

import com.gofast.entity.Booking;
import com.gofast.entity.Bus;
import com.gofast.entity.User;
import com.gofast.repository.BookingRepository;
import com.gofast.repository.BusRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Service
public class BookingService {

    @Autowired
    private BookingRepository bookingRepository;
    
    @Autowired
    private BusRepository busRepository;

    @Transactional
    public Booking createDraftBooking(User user, String origin, String destination, 
                                      LocalDate date, LocalTime time, 
                                      UUID busId, Integer seatNumber, Integer price) {
        
        // 1. Check if the seat is already booked or locked
        boolean isTaken = bookingRepository.existsByBusIdAndDepartureDateAndSeatNumberAndStatusNot(
            busId, date, seatNumber, "CANCELLED"
        );
        
        if (isTaken) {
            throw new RuntimeException("Sorry, this seat was just taken!");
        }

        // 2. Fetch the Bus
        Bus bus = busRepository.findById(busId)
            .orElseThrow(() -> new RuntimeException("Bus not found"));

        // 3. Create the Draft Booking
        Booking booking = new Booking();
        booking.setUser(user);
        booking.setPassengerName(user.getFullName());
        booking.setOrigin(origin);
        booking.setDestination(destination);
        booking.setDepartureDate(date);
        booking.setDepartureTime(time);
        booking.setBus(bus);
        booking.setSeatNumber(seatNumber);
        booking.setTotalPrice(price);
        booking.setStatus("DRAFT"); // Waiting for payment

        return bookingRepository.save(booking);
    }
}
```

---

## Step 4: Create the Data Transfer Objects (DTOs)

Create a class to handle the incoming JSON payload from the frontend.

```java
package com.gofast.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Data
public class BookingRequest {
    private String origin;
    private String destination;
    private LocalDate departureDate;
    private LocalTime departureTime;
    private UUID busId;
    private Integer selectedSeat;
    private Integer price;
}
```

---

## Step 5: Create the Booking Controller

Finally, expose an API endpoint that `Booking.js` can `fetch()`.

```java
package com.gofast.controller;

import com.gofast.dto.BookingRequest;
import com.gofast.entity.Booking;
import com.gofast.entity.User;
import com.gofast.service.BookingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/bookings")
@CrossOrigin(origins = "*")
public class BookingController {

    @Autowired
    private BookingService bookingService;

    @PostMapping("/draft")
    public ResponseEntity<?> createDraft(@RequestBody BookingRequest request) {
        try {
            // Note: In a real app, you get the 'User' from the JWT Security Context, 
            // not hardcoded. 
            User dummyUser = new User(); // Replace with actual authenticated user
            
            Booking draft = bookingService.createDraftBooking(
                dummyUser,
                request.getOrigin(),
                request.getDestination(),
                request.getDepartureDate(),
                request.getDepartureTime(),
                request.getBusId(),
                request.getSelectedSeat(),
                request.getPrice()
            );

            return ResponseEntity.ok("Booking draft created successfully with ID: " + draft.getId());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
```

## How to hook it into the Frontend (`Booking.js`)

Right now, your `Booking.js` has a `saveDraft()` function that does this:

```javascript
function saveDraft() {
  // Draft will be saved to backend API
  alert("Booking draft saved!");
}
```

Once the Java backend above is running, you would update that function to look exactly like the login fetch:

```javascript
async function saveDraft() {
  const data = getFormData();
  
  try {
      const response = await fetch('http://localhost:5500/api/bookings/draft', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}` // Send the JWT!
          },
          body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (response.ok) {
          alert("Booking draft saved successfully!");
      } else {
          alert("Error: " + result.message); // E.g., "Sorry, this seat was just taken!"
      }
  } catch (error) {
      console.error("Network error");
  }
}
```
