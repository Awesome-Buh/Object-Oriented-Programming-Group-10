package com.validation.page.entity;

import jakarta.persistence.*;
import java.util.List;

@Entity
@Table(name = "buses")
public class Bus {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String busNumber; // e.g., "BUS-2026-XYZ"

    @Column(nullable = false)
    private String operatorName; // e.g., "Greyhound", "National Express"

    @Column(nullable = false)
    private int totalSeats; // e.g., 50 seats

    @Column(nullable = false)
    private String busType; // e.g., "VIP Luxury", "Standard AC"

    // One bus can have many sold tickets associated with it
    @OneToMany(mappedBy = "bus", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Ticket> tickets;

    // --- Constructors ---
    public Bus() {
    }

    public Bus(String busNumber, String operatorName, int totalSeats, String busType) {
        this.busNumber = busNumber;
        this.operatorName = operatorName;
        this.totalSeats = totalSeats;
        this.busType = busType;
    }

    // --- Getters and Setters ---
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getBusNumber() {
        return busNumber;
    }

    public void setBusNumber(String busNumber) {
        this.busNumber = busNumber;
    }

    public String getOperatorName() {
        return operatorName;
    }

    public void setOperatorName(String operatorName) {
        this.operatorName = operatorName;
    }

    public int getTotalSeats() {
        return totalSeats;
    }

    public void setTotalSeats(int totalSeats) {
        this.totalSeats = totalSeats;
    }

    public String getBusType() {
        return busType;
    }

    public void setBusType(String busType) {
        this.busType = busType;
    }

    public List<Ticket> getTickets() {
        return tickets;
    }

    public void setTickets(List<Ticket> tickets) {
        this.tickets = tickets;
    }
}
