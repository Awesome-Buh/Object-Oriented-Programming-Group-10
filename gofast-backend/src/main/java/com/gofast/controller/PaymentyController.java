package com.gofast.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.gofast.dto.PaymentRequestDto;
import com.gofast.dto.PaymentResponseDto;
import com.gofast.service.PaymentService;

@RestController
@RequestMapping("api/payments")
public class PaymentyController {
    @Autowired
    private PaymentService paymentService;

    @PostMapping("/initiate")
    public ResponseEntity<PaymentResponseDto> initiatePayment(@RequestBody PaymentRequestDto request) {
        
        return ResponseEntity.ok(paymentService.initiatePayment(request));
    }
}
