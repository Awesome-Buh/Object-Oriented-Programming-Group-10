package com.gofast.dto;

import java.util.UUID;

public class PaymentRequestDto {
    private UUID bookingId;
    private String paymentMethod;
    private String phoneNumber;

    public PaymentRequestDto() {
    }

    public PaymentRequestDto(UUID bookingId, String paymentMethod, String phoneNumber) {
        this.bookingId = bookingId;
        this.paymentMethod = paymentMethod;
        this.phoneNumber = phoneNumber;
    }

    public UUID getBookingId() {
        return bookingId;
    }

    public void setBookingId(UUID bookingId) {
        this.bookingId = bookingId;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }
}
