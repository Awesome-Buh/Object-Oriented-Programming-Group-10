package com.validation.page.repository;

import com.validation.page.entity.Ticket;
import com.validation.page.entity.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long> {

    List<Ticket> findByStatus(BookingStatus status);

}
