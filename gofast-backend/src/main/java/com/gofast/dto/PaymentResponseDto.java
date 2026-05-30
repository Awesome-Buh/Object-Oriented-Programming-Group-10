package com.gofast.dto;

import java.util.UUID;

public class PaymentResponseDto {

    private boolean success;

    private UUID paymentId;

    private String transactionId;

    private String status;

    private Integer amount;

    private String message;

    // Empty constructor
    public PaymentResponseDto() {
    }

    // Full constructor
    public PaymentResponseDto(
            boolean success,
            UUID paymentId,
            String transactionId,
            String status,
            Integer amount,
            String message) {

        this.success = success;
        this.paymentId = paymentId;
        this.transactionId = transactionId;
        this.status = status;
        this.amount = amount;
        this.message = message;
    }

    // Getters
    public boolean isSuccess() {
        return success;
    }

    public UUID getPaymentId() {
        return paymentId;
    }

    public String getTransactionId() {
        return transactionId;
    }

    public String getStatus() {
        return status;
    }

    public Integer getAmount() {
        return amount;
    }

    public String getMessage() {
        return message;
    }

    // Setters
    public void setSuccess(boolean success) {
        this.success = success;
    }

    public void setPaymentId(UUID paymentId) {
        this.paymentId = paymentId;
    }

    public void setTransactionId(String transactionId) {
        this.transactionId = transactionId;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public void setAmount(Integer amount) {
        this.amount = amount;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}

