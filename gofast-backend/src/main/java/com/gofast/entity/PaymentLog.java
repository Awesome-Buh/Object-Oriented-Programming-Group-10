package com.gofast.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "payment_logs")

public class PaymentLog {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne
    private Payment payment;

    private String event;

    @Column(columnDefinition = "TEXT")
    private String response;

    private LocalDateTime timestamp;

     public PaymentLog() {
    }

    // Getters
    public UUID getId() {
        return id;
    }

    public Payment getPayment() {
        return payment;
    }

    public String getEvent() {
        return event;
    }

    public String getResponse() {
        return response;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    // Setters
    public void setId(UUID id) {
        this.id = id;
    }

    public void setPayment(Payment payment) {
        this.payment = payment;
    }

    public void setEvent(String event) {
        this.event = event;
    }

    public void setResponse(String response) {
        this.response = response;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
}
