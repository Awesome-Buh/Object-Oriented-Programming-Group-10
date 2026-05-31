package com.validation.page.service.impl;

import com.validation.page.entity.BookingStatus;
import com.validation.page.entity.Ticket;
import com.validation.page.dataTransferObject.TicketRespondDTO;
import com.validation.page.repository.TicketRepository;
import com.validation.page.service.TicketService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class TicketServiceImpl implements TicketService{
    @Autowired
    public TicketRepository ticketRepository;
   
    @Override
    public List<TicketRespondDTO> getAllConfirmedBookings() {
        List<Ticket> tickets = ticketRepository.findByStatus(BookingStatus.CONFIRMED);


        return tickets.stream()
                .map(this::convertToRespondDTO) // Convert each Ticket to TicketRespondDTO
                .collect(Collectors.toList());
    }

    private TicketRespondDTO convertToRespondDTO(Ticket ticket) {
        TicketRespondDTO dto = new TicketRespondDTO();
            dto.setBookingId(ticket.getId());
            dto.setFullName(ticket.getFullName());
            dto.setPhone(ticket.getPhone());
            dto.setOrigin(ticket.getOrigin());
            dto.setDestination(ticket.getDestination());
            dto.setDepartureDate(ticket.getDepartureDate());
            dto.setDepartureTime(ticket.getDepartureTime());
            dto.setSelectedSeat(ticket.getSelectedSeat());
            dto.setPrice(ticket.getPrice());;
            dto.setStatus(ticket.getStatus().toString());
            return dto;
    }
}
