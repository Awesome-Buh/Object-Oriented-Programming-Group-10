package com.gofast.service;

import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.gofast.dto.PaymentRequestDto;
import com.gofast.dto.PaymentResponseDto;
import com.gofast.entity.Booking;
import com.gofast.entity.Payment;
import com.gofast.enums.BookingStatus;
import com.gofast.enums.PaymentMethod;
import com.gofast.enums.PaymentStatus;
import com.gofast.repository.BookingRepository;
import com.gofast.repository.PaymentRepository;

@Service
public class PaymentService {
    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    public PaymentResponseDto initiatePayment(PaymentRequestDto request) {
        Booking booking = bookingRepository.findById(request.getBookingId())
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new RuntimeException("Booking is not confirmed");
        }

        Payment payment = new Payment();
        payment.setBooking(booking);
        payment.setAmount(booking.getAmount());
        payment.setPhoneNumber(request.getPhoneNumber());
        payment.setPaymentMethod(PaymentMethod.valueOf(request.getPaymentMethod().toUpperCase()));
        payment.setTransactionId(UUID.randomUUID().toString());
        payment.setStatus(PaymentStatus.PENDING);
        payment.setCreatedAt(LocalDateTime.now());
        payment = paymentRepository.save(payment);

        return new PaymentResponseDto(
                true,
                payment.getId(),
                payment.getTransactionId(),
                payment.getStatus().name(),
                payment.getAmount(),
                "payment initiated"
        );
    }

    public void verifyPayment(UUID paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Payment not found"));

        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setCompletedAt(LocalDateTime.now());

        Booking booking = payment.getBooking();
        booking.setStatus(BookingStatus.PAID);

        bookingRepository.save(booking);
        paymentRepository.save(payment);
    }
}
