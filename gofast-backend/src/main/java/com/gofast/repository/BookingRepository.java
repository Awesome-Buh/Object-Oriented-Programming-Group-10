package com.gofast.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.gofast.entity.Booking;
import com.gofast.enums.BookingStatus;

@Repository
public interface BookingRepository extends JpaRepository<Booking, UUID> {
	List<Booking> findByStatus(BookingStatus status);
}
