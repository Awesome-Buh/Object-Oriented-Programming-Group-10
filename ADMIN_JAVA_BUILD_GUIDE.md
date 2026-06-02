# Building the Admin Functionality in Java (Spring Boot)

The Admin dashboard is a critical part of the application. Unlike regular user pages, the admin section requires strict security checks. **The frontend admin page provides the UI to manage buses, routes, and view bookings, but the backend is responsible for verifying that the user actually has `ADMIN` privileges before executing any action.**

Here is the breakdown of responsibilities:

### What the Frontend (`Admin.js` or `Dashboard.js`) does:
1. Provides forms to add new buses or routes.
2. Displays tables of all users, all bookings, and overall revenue.
3. Sends CRUD (Create, Read, Update, Delete) requests to the backend.
4. Handles unauthorized errors if a normal user tries to access admin data.

### What the Backend (Java/Spring Boot) does:
1. **Role-Based Access Control (RBAC)**: Checks the JWT token to ensure the requester has the `ROLE_ADMIN` authority.
2. **Data Management**: Performs CRUD operations directly on the database (e.g., saving a new Bus).
3. **Aggregation/Analytics**: Calculates total revenue, total bookings, etc., to send back to the dashboard.

---

## Step 1: Update the User Entity for Roles

First, ensure your `User` entity has a role field so you know who is an admin.

```java
// Inside com.gofast.entity.User
// ... other fields ...
@Enumerated(EnumType.STRING)
private Role role; // Enum: USER, ADMIN
```

In your Spring Security configuration, you need to restrict `/api/admin/**` endpoints to admins only.

```java
// Example in SecurityConfig.java
http.authorizeHttpRequests(auth -> auth
    .requestMatchers("/api/admin/**").hasRole("ADMIN")
    // ... other rules ...
);
```

---

## Step 2: Create the Admin Services

You'll need a service to handle administrative tasks, like creating a new bus or getting dashboard stats.

```java
package com.gofast.service;

import com.gofast.entity.Bus;
import com.gofast.repository.BookingRepository;
import com.gofast.repository.BusRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class AdminService {

    @Autowired
    private BusRepository busRepository;
    
    @Autowired
    private BookingRepository bookingRepository;

    // --- Bus Management ---
    public Bus addNewBus(String name, Integer capacity) {
        Bus bus = new Bus();
        bus.setName(name);
        bus.setCapacity(capacity);
        return busRepository.save(bus);
    }
    
    public List<Bus> getAllBuses() {
        return busRepository.findAll();
    }

    // --- Dashboard Analytics ---
    public long getTotalBookings() {
        return bookingRepository.count();
    }
    
    public long getTotalRevenue() {
        // Custom query in your repository: "SELECT SUM(b.totalPrice) FROM Booking b WHERE b.status = 'PAID'"
        Long revenue = bookingRepository.calculateTotalRevenue(); 
        return revenue != null ? revenue : 0L;
    }
}
```

---

## Step 3: Create the Admin Controller

This controller will handle requests specifically from the admin dashboard.

```java
package com.gofast.controller;

import com.gofast.entity.Bus;
import com.gofast.service.AdminService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
// Alternatively, method-level security:
// @PreAuthorize("hasRole('ADMIN')") 
public class AdminController {

    @Autowired
    private AdminService adminService;

    // --- Dashboard Stats Endpoint ---
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalBookings", adminService.getTotalBookings());
        stats.put("totalRevenue", adminService.getTotalRevenue());
        return ResponseEntity.ok(stats);
    }

    // --- Bus Management Endpoints ---
    @PostMapping("/buses")
    public ResponseEntity<Bus> addBus(@RequestBody BusRequest request) {
        Bus newBus = adminService.addNewBus(request.getName(), request.getCapacity());
        return ResponseEntity.ok(newBus);
    }

    @GetMapping("/buses")
    public ResponseEntity<List<Bus>> getAllBuses() {
        return ResponseEntity.ok(adminService.getAllBuses());
    }
}
```

*Note: You would need a `BusRequest` DTO with `name` and `capacity` fields.*

---

## How to hook it into the Frontend (`Admin.js`)

When your frontend admin dashboard loads, you will fetch the stats and data. You MUST pass the JWT token, otherwise Spring Security will block the request.

```javascript
// Fetch Dashboard Stats
async function loadDashboardStats() {
  try {
      const response = await fetch('http://localhost:5500/api/admin/stats', {
          method: 'GET',
          headers: {
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
      });
      
      if (response.ok) {
          const stats = await response.json();
          document.getElementById('total-bookings').innerText = stats.totalBookings;
          document.getElementById('total-revenue').innerText = "$" + stats.totalRevenue;
      } else if (response.status === 403) {
          alert("Access Denied! Admin privileges required.");
          window.location.href = "login.html";
      }
  } catch (error) {
      console.error("Failed to load stats");
  }
}

// Add a new Bus
async function addNewBus(event) {
    event.preventDefault();
    const busData = {
        name: document.getElementById('busName').value,
        capacity: parseInt(document.getElementById('busCapacity').value)
    };

    try {
        const response = await fetch('http://localhost:5500/api/admin/buses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            },
            body: JSON.stringify(busData)
        });
        
        if (response.ok) {
            alert("Bus added successfully!");
            // Refresh bus list...
        }
    } catch (error) {
        console.error("Error adding bus");
    }
}
```
