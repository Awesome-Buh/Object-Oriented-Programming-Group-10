# Building the Payment Functionality in Java (Spring Boot)

To answer your question regarding the payment page: **Just like booking, the frontend payment page is only responsible for collecting card details securely or initiating a payment flow.** The backend handles the actual transaction verification, communicates with payment gateways (like Stripe, Paystack, or a custom mocked gateway), and updates the booking status.

Here is the breakdown of responsibilities:

### What the Frontend (`Payment.js`) does:
1. Displays the total amount due based on the draft booking.
2. Collects payment details (card number, expiry, CVV) or redirects to a secure payment gateway.
3. Sends a payment intent/process request to the backend.
4. Shows a success or failure message based on the backend's response.

### What the Backend (Java/Spring Boot) does:
1. **Verification**: Verifies the booking exists, is still in "DRAFT" status, and the amount matches.
2. **Gateway Communication**: Securely communicates with a payment processor to charge the card.
3. **Transaction Record**: Records the payment transaction in the database (success or failure).
4. **Status Update**: If successful, updates the booking status from "DRAFT" to "PAID" or "CONFIRMED".

Here is a comprehensive guide on how to build the backend logic for the **"Process Payment"** flow using Java Spring Boot.

---

## Step 1: Create the Payment Entity

You need an entity to track transaction attempts, whether successful or failed.

```java
package com.gofast.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "payments")
@Data
public class Payment {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne
    @JoinColumn(name = "booking_id")
    private Booking booking; // Links to your Booking entity

    private Integer amount;
    
    private String paymentMethod; // "CARD", "BANK_TRANSFER"
    private String transactionReference; // Reference from the payment gateway
    
    private String status; // "SUCCESS", "FAILED", "PENDING"
    
    private LocalDateTime paymentDate;
}
```

---

## Step 2: Create the Repositories

Create a repository to save and find payment records.

```java
package com.gofast.repository;

import com.gofast.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;


public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    Payment findByTransactionReference(String transactionReference);
}
```

---

## Step 3: Create the Payment Service

This service will handle the business logic of processing the payment. We will simulate a payment gateway integration here.

```java
package com.gofast.service;

import com.gofast.entity.Booking;
import com.gofast.entity.Payment;
import com.gofast.repository.BookingRepository;
import com.gofast.repository.PaymentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class PaymentService {

    @Autowired
    private PaymentRepository paymentRepository;
    
    @Autowired
    private BookingRepository bookingRepository;

    @Transactional
    public Payment processPayment(UUID bookingId, String cardNumber, String cvv, String expiryDate) {
        
        // 1. Fetch the Draft Booking
        Booking booking = bookingRepository.findById(bookingId)
            .orElseThrow(() -> new RuntimeException("Booking not found"));
            
        if (!"DRAFT".equals(booking.getStatus())) {
            throw new RuntimeException("Booking is already processed or cancelled.");
        }

        // 2. Simulate Payment Gateway Call
        // In reality, you would call Stripe or Paystack APIs here.
        boolean paymentSuccessful = simulateGatewayCharge(cardNumber, booking.getTotalPrice());
        
        // 3. Record the Payment
        Payment payment = new Payment();
        payment.setBooking(booking);
        payment.setAmount(booking.getTotalPrice());
        payment.setPaymentMethod("CARD");
        payment.setTransactionReference("TXN-" + UUID.randomUUID().toString());
        payment.setPaymentDate(LocalDateTime.now());
        
        if (paymentSuccessful) {
            payment.setStatus("SUCCESS");
            // 4. Update Booking Status
            booking.setStatus("PAID");
            bookingRepository.save(booking);
        } else {
            payment.setStatus("FAILED");
        }

        return paymentRepository.save(payment);
    }
    
    private boolean simulateGatewayCharge(String cardNumber, Integer amount) {
        // Dummy logic: reject if card number starts with '4' (just for testing failures)
        if (cardNumber != null && cardNumber.startsWith("4")) {
            return false;
        }
        return true;
    }
}
```

---

## Step 4: Create the Data Transfer Objects (DTOs)

Create classes to handle the incoming JSON payload for payment details.

```java
package com.gofast.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class PaymentRequest {
    private UUID bookingId;
    private String cardNumber;
    private String cardHolderName;
    private String expiryDate;
    private String cvv;
}
```

```java
package com.gofast.dto;

import lombok.Data;

@Data
public class PaymentResponse {
    private boolean success;
    private String message;
    private String transactionReference;
}
```

---

## Step 5: Create the Payment Controller

Expose an API endpoint that the frontend can call to initiate the payment.

```java
package com.gofast.controller;

import com.gofast.dto.PaymentRequest;
import com.gofast.dto.PaymentResponse;
import com.gofast.entity.Payment;
import com.gofast.service.PaymentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = "*")
public class PaymentController {

    @Autowired
    private PaymentService paymentService;

    @PostMapping("/process")
    public ResponseEntity<PaymentResponse> processPayment(@RequestBody PaymentRequest request) {
        PaymentResponse response = new PaymentResponse();
        try {
            Payment payment = paymentService.processPayment(
                request.getBookingId(),
                request.getCardNumber(),
                request.getCvv(),
                request.getExpiryDate()
            );

            if ("SUCCESS".equals(payment.getStatus())) {
                response.setSuccess(true);
                response.setMessage("Payment processed successfully.");
                response.setTransactionReference(payment.getTransactionReference());
                return ResponseEntity.ok(response);
            } else {
                response.setSuccess(false);
                response.setMessage("Payment failed. Please check your card details.");
                response.setTransactionReference(payment.getTransactionReference());
                return ResponseEntity.badRequest().body(response);
            }
        } catch (Exception e) {
            response.setSuccess(false);
            response.setMessage(e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
}
```

## How to hook it into the Frontend (`Payment.js`)

In your frontend JavaScript, you would collect the form data and send it to the backend endpoint we just created.

```javascript
async function submitPayment(event) {
  event.preventDefault();
  
  // Get booking ID from URL or localStorage from the previous step
  const bookingId = localStorage.getItem("currentBookingId");
  
  const paymentData = {
      bookingId: bookingId,
      cardNumber: document.getElementById('cardNumber').value,
      cardHolderName: document.getElementById('cardName').value,
      expiryDate: document.getElementById('expiryDate').value,
      cvv: document.getElementById('cvv').value
  };
  
  try {
      const response = await fetch('http://localhost:5500/api/payments/process', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: JSON.stringify(paymentData)
      });
      
      const result = await response.json();
      
      if (result.success) {
          alert("Payment Successful! Ref: " + result.transactionReference);
          // Redirect to a success/ticket page
          window.location.href = "ticket.html";
      } else {
          alert("Payment Failed: " + result.message);
      }
  } catch (error) {
      console.error("Network error during payment processing");
      alert("An error occurred while processing your payment. Please try again later.");
  }
}
```
