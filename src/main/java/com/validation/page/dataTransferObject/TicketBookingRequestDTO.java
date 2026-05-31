package com.validation.page.dataTransferObject;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public class TicketBookingRequestDTO {

    @NotNull(message = "User ID cannot be null")
    private Long userId;

    @NotNull(message = "Ticket ID cannot be null")
    private Long ticketId;

    @Min(value = 1, message = "You must book at least 1 ticket")
    private int quantity;

    // Constructors 
    public TicketBookingRequestDTO() {
    }

    public TicketBookingRequestDTO(Long userId, Long ticketId, int quantity) {
        this.userId = userId;
        this.ticketId = ticketId;
        this.quantity = quantity;
    }

    // Getters and Setters 
    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Long getTicketId() {
        return ticketId;
    }

    public void setTicketId(Long ticketId) {
        this.ticketId = ticketId;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }
}
