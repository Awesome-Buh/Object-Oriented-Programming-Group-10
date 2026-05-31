package com.validation.page.service;

import java.util.List;
import com.validation.page.dataTransferObject.TicketRespondDTO;

public interface TicketService {
    List<TicketRespondDTO> getAllConfirmedBookings();

}
