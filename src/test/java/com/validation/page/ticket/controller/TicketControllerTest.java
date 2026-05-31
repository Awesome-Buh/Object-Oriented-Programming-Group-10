package com.validation.page.ticket.controller;

import com.validation.page.controller.TicketController;
import com.validation.page.service.TicketService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;

import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;


import java.util.Collections;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TicketController.class) 
public class TicketControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TicketService ticketService;

    @Test
    public void testLoadAllBookings() throws Exception {
        // Fixed to Collections.emptyList()
        Mockito.when(ticketService.getAllConfirmedBookings()).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/tickets/bookings")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }
}
