# GoFast Working Page Backend - Comprehensive Java Learning Guide

## Table of Contents
1. [Overview & Requirements](#overview--requirements)
2. [Key Concepts](#key-concepts)
3. [Architecture & Design](#architecture--design)
4. [Step-by-Step Implementation Guide](#step-by-step-implementation-guide)
   - [Part 1: Routes & Bus Management](#part-1-routes--bus-management)
   - [Part 2: Booking Management](#part-2-booking-management)
   - [Part 3: Seat Management & Locking](#part-3-seat-management--locking)
   - [Part 4: Booking Confirmation & Cancellation](#part-4-booking-confirmation--cancellation)
5. [Advanced Features](#advanced-features)
6. [Testing Your Implementation](#testing-your-implementation)

---

## Overview & Requirements

### What We're Building

The "Working Page" is the main user dashboard where authenticated users can:
1. **Search & Browse Routes** - Find available bus routes
2. **View Bus Details** - See available buses with pricing and amenities
3. **Select Seats** - Interactive seat selection with real-time availability
4. **Create Bookings** - Create draft bookings with seat locks
5. **Manage Bookings** - View, confirm, and cancel their bookings
6. **Download Tickets** - Generate and retrieve tickets

### Key Backend Requirements from BACKEND_REQUIREMENTS.txt

**Section 2: Route & Bus Management**
- GET /api/routes - Find routes by origin/destination/date
- GET /api/buses - Get buses for a specific route
- GET /api/buses/:busId/seats - Get available seats for a bus

**Section 3: Booking Management**
- POST /api/bookings/draft - Create draft booking with seat lock
- POST /api/bookings/:bookingId/confirm - Confirm booking details
- DELETE /api/bookings/:bookingId - Cancel booking
- GET /api/bookings/:bookingId - Get specific booking details
- GET /api/bookings - Get user's all bookings with pagination

**Section 5: Ticket Generation**
- GET /api/tickets/:bookingId - Generate/retrieve ticket for paid booking

---

## Key Concepts

### Concept 1: Routes and Buses

**What it is:** The backbone of the ticketing system - routes define where buses travel, buses define capacity and amenities.

**Structure:**
```
Route (e.g., Douala → Yaoundé)
├── Schedule Date/Time
├── Base Price
├── Distance
├── Estimated Duration
└── Buses Operating on This Route
    ├── Bus 1: Executive (16 seats)
    ├── Bus 2: Standard (32 seats)
    └── Bus 3: Luxury (16 seats)
```

**Database Relationships:**
```
routes table
    ↓
route_schedules table (departure dates/times)
    ↓
bus_routes table (which buses operate on this route)
    ↓
buses table (bus details)
    ↓
seats table (seat numbers)
    ↓
seat_bookings table (which seats are booked)
```

**Key takeaway:** You need to query multiple tables with JOINs to get complete information.

---

### Concept 2: Seat Locking & Race Conditions

**What it is:** A mechanism to prevent two users from booking the same seat simultaneously.

**The Problem:**
```
Time 1: User A checks seat 5 → Available
Time 2: User B checks seat 5 → Available
Time 3: User A books seat 5 → Success
Time 4: User B books seat 5 → Should FAIL (but didn't have lock!)
```

**The Solution - Seat Locks:**
```
1. User searches seats → Sees available
2. User clicks "select seat 5" → Lock acquired (5-minute TTL)
3. User continues booking with lock held
4. User pays → Lock converted to actual booking
5. If user leaves → Lock expires after 5 mins, seat becomes available again

Lock Table Structure:
Key: seat_lock:busId:seatNumber:departureDate
TTL: 5 minutes (auto-deletes if payment fails)
Value: bookingId (to know which booking holds the lock)
```

**Key takeaway:** Locks are TEMPORARY, not permanent bookings. They expire and release seats.

---

### Concept 3: Booking Lifecycle

**What it is:** Bookings go through multiple states as users complete the checkout process.

**Booking States:**
```
┌─────────────────────────────────────────────────┐
│                  BOOKING LIFECYCLE              │
├─────────────────────────────────────────────────┤
│                                                 │
│  draft                                          │
│  (User selected seat, hasn't confirmed yet)     │
│         ↓                                        │
│  confirmed                                      │
│  (User confirmed details, awaiting payment)     │
│         ↓                                        │
│  pending_payment                                │
│  (Payment in progress with mobile money)        │
│         ↓                                        │
│  paid                                           │
│  (Payment successful, ticket generated)         │
│         ↓                                        │
│  completed                                      │
│  (Trip finished)                                │
│                                                 │
│  ✗ cancelled (User cancelled before/after pay) │
│  ✗ expired (Lock timed out without payment)    │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Key Actions:**
- Draft → Confirmed: `POST /api/bookings/:bookingId/confirm`
- Any State → Cancelled: `DELETE /api/bookings/:bookingId`
- Confirmed/Pending → Paid: Payment system updates this

**Key takeaway:** Track booking status carefully. Different actions are allowed in different states.

---

### Concept 4: Pagination & Filtering

**What it is:** Breaking large datasets into smaller chunks to improve performance.

**Example - User's Bookings:**
```
GET /api/bookings?status=paid&limit=10&offset=20

Means: Get 10 paid bookings, starting from position 20
(skips first 20, shows 21-30)

Response includes:
- total: 150 (total bookings across all pages)
- bookings: [...] (10 bookings)
- Current page: (20 + 1) to (20 + 10) = 21-30
- Next page would be: offset=30
- Prev page would be: offset=10
```

**Key takeaway:** Always include total count and current page info for frontend pagination.

---

## Architecture & Design

### User Flow Diagram

```
┌──────────────────────────────────────┐
│      WORKING PAGE (Frontend)         │
│  - Search routes                     │
│  - Select seat                       │
│  - Confirm booking                   │
│  - View bookings                     │
└───────────────┬──────────────────────┘
                │
         ┌──────▼────────┐
         │   BACKEND     │
         │   (Java)      │
         └──────┬────────┘
                │
         ┌──────┴──────────────────────┐
         │                             │
    ┌────▼────┐            ┌──────────▼──────┐
    │ MySQL   │            │  Redis/Cache    │
    │ Routes  │            │  Seat Locks     │
    │ Buses   │            │  Rate Limits    │
    │ Seats   │            │  Blacklists     │
    │ Bookings│            └─────────────────┘
    └─────────┘
```

### Key Databases Tables for Working Page

**routes table:**
- id, origin, destination, distance, basePrice, estimatedDuration, isActive

**route_schedules table:**
- id, routeId, departureDate, departureTime, expectedArrivalTime, isActive

**buses table:**
- id, name, licensePlate, capacity, type (executive/standard/luxury), operatorId, status

**bus_routes table:**
- id, busId, routeId, departureDate, departureTime, currentBookedSeats

**seats table:**
- id, busId, seatNumber, row, column, seatType (window/aisle)

**seat_locks table:**
- id, bookingId, busId, seatNumber, departureDate, lockedAt, expiresAt (TTL)

**bookings table:**
- id, userId, bookingReference, passengerName, email, phone, origin, destination
- departureDate, departureTime, busId, seatNumber, totalPrice, status, createdAt, updatedAt

**seat_bookings table:**
- id, bookingId, busId, seatNumber, departureDate, departureTime, bookedAt

---

## Step-by-Step Implementation Guide

# PART 1: ROUTES & BUS MANAGEMENT

## Understanding the Flow

**User Action:** "I want to go from Douala to Yaoundé on May 15, 2026"

**Backend Steps:**
1. Find all routes matching origin & destination
2. Filter by date (only show departures on that date)
3. Count available buses for each route
4. Return route info with pricing and availability

**TASK: Create Route & Bus Entities**

**What you need:**

1. **Route Entity** - Represents a route between two cities
   - Fields: id, origin, destination, distance, basePrice, estimatedDuration, isActive
   - Relationships: Has many route_schedules, has many buses (through bus_routes)

2. **RouteSchedule Entity** - Specific departure dates/times for a route
   - Fields: id, routeId (FK), departureDate, departureTime, expectedArrivalTime, isActive
   - Why separate? Same route runs multiple times per day/month

3. **Bus Entity** - A physical bus vehicle
   - Fields: id, name, licensePlate, capacity, type, operatorId, status
   - Status values: active, maintenance, retired

4. **BusRoute Entity** - Junction table (many-to-many between buses and routes)
   - Why? Same bus can run on multiple routes, same route has multiple buses
   - Fields: id, busId (FK), routeId (FK), departureDate, departureTime, currentBookedSeats

5. **Seat Entity** - Individual seats in a bus
   - Fields: id, busId (FK), seatNumber, row, column, seatType (window/aisle)
   - Example: Bus has 16 seats numbered 1-16 in 4 rows × 4 columns

**Hints for implementation:**
- Use @Entity and @Table annotations
- Use @ManyToOne for foreign key relationships
- Use @ManyToMany for routes having multiple buses
- Create proper constructors, getters, setters (use @Data from Lombok)
- Add timestamps: @Column(nullable=false, updatable=false) for createdAt
- Add indexes on frequently queried columns: @Index on origin, destination, departureDate

---

## Create Route Repository & DTOs

**TASK: Create data access and transfer objects**

**DTOs to Create:**

1. **RouteSearchRequest.java**
   - Fields: origin, destination, departureDate
   - Validation: @NotBlank, @FutureOrPresent for date

2. **RouteResponse.java**
   - Fields: routeId, origin, destination, basePrice, distance, estimatedDuration, availableBuses
   - What to return: Info user sees when searching

3. **BusResponse.java**
   - Fields: busId, busName, capacity, type, amenities (List), availableSeats, price, operator
   - Calculation: availableSeats = capacity - currentBookedSeats

4. **SeatLayoutResponse.java**
   - Fields: busId, totalSeats, bookedSeats (List), availableSeats (List), layout (rows, seatsPerRow, aislePosition)
   - Purpose: Frontend needs to render seat selection grid

**TASK: Create Repositories**

1. **RouteRepository** - Query routes
   - Methods: findByOriginAndDestination(String origin, String destination)
   - Why JPA? Method names auto-generate SQL queries

2. **RouteScheduleRepository** - Query schedules
   - Methods: findByRouteIdAndDepartureDate(UUID routeId, LocalDate date)

3. **BusRepository** - Query buses
   - Methods: findByIdAndStatus(UUID busId, String status)

4. **SeatRepository** - Query seats
   - Methods: findByBusIdOrderBySeatNumber(UUID busId)

5. **SeatBookingRepository** - Query booked seats
   - Methods: findByBusIdAndDepartureDateAndDepartureTime(UUID busId, LocalDate date, LocalTime time)
   - Purpose: Know which seats are booked on a specific departure

**Hints:**
- Spring Data JPA auto-implements repository methods
- Use @Query for complex queries with SQL
- Use proper pagination: Page<T> findByStatus(String status, Pageable pageable)

---

## Create Route Search Service

**TASK: Create RouteService.java with business logic**

**Method: searchRoutes(RouteSearchRequest request)**

**Pseudo-code:**
```
1. Validate input
   - Check origin and destination are different
   - Check date is in future (not past)

2. Find routes matching criteria
   - Query routes WHERE origin = request.origin AND destination = request.destination
   - If no routes found → return empty list

3. For each route, find schedules on that date
   - Query route_schedules WHERE routeId = route.id AND departureDate = request.date
   - Get departure times

4. For each schedule, count available buses
   - Query bus_routes for this route + date + time
   - For each bus:
     - Get total capacity
     - Count booked seats from seat_bookings
     - Calculate available seats = capacity - booked

5. If no available seats on any bus, filter out that schedule

6. Build response
   - Include: routeId, origin, destination, price, duration, availableBuses count

7. Cache results for 1 hour (Redis)
   - Key: "routes:origin:destination:date"
   - TTL: 3600 seconds

8. Return routes sorted by price or departure time
```

**Questions to guide your thinking:**
- Why separate route from schedule?
- Why do we count booked seats instead of querying seat table directly?
- Why cache results?
- What happens if bus is in "maintenance" status?

---

## Create Buses & Seats Service

**TASK: Create BusService.java**

**Method: getAvailableBuses(UUID routeId, LocalDate date, LocalTime time)**

**Pseudo-code:**
```
1. Validate inputs
   - Check route exists
   - Check date is valid

2. Query bus_routes for this route + date + time
   - Get all buses scheduled for this departure

3. For each bus, calculate availability
   - Get bus capacity
   - Count booked seats for this bus on this date/time
   - availableSeats = capacity - bookedCount
   - If availableSeats == 0, skip this bus

4. Get amenities for each bus
   - Query bus_amenities table
   - Join results

5. Get operator info for each bus
   - Query operators table

6. Build response with all bus details

7. Return sorted by:
   - Best availability first, or
   - By bus type (executive, standard, luxury)
```

**TASK: Create SeatService.java**

**Method: getAvailableSeats(UUID busId, LocalDate date, LocalTime time)**

**Pseudo-code:**
```
1. Validate inputs
   - Check bus exists

2. Get all seats for this bus
   - Query seats WHERE busId = busId
   - Includes: seat number, row, column

3. Get booked seats for this departure
   - Query seat_bookings WHERE busId = busId 
     AND departureDate = date AND departureTime = time
   - Returns: List of booked seat numbers

4. Calculate available seats
   - availableSeats = allSeats - bookedSeats

5. Build layout info
   - From bus table: Get capacity
   - Calculate: rows = capacity / seatsPerRow
   - Common layout: 4 columns (window-aisle-aisle-window)

6. Return layout with booked and available seats
   - Frontend uses this to render interactive grid

7. Important: Check seat_locks too!
   - Locked seats should appear as "temporarily unavailable"
   - Query seat_locks WHERE busId = busId AND expiredAt > now()
```

**Key Decision Point:**
- Should locked seats appear as booked or greyed out?
- Answer: Show as greyed out with message "Being booked, will free in X minutes"

---

## Create Route API Endpoint

**TASK: Create RouteController.java**

**Endpoint: GET /api/routes**

**Method: searchRoutes(RouteSearchRequest request)**

**Implementation hints:**
- @GetMapping("/routes")
- @Valid @RequestBody or @RequestParam?
  - Answer: @RequestParam because it's GET (no body)
  - origin, destination, departureDate as query params
- Call routeService.searchRoutes()
- Return ResponseEntity with appropriate status:
  - 200 OK if routes found
  - 200 OK with empty list if no routes
  - 400 BAD_REQUEST if date is in past

**Example HTTP call:**
```
GET /api/routes?origin=Douala&destination=Yaoundé&departureDate=2026-05-15
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "routes": [
    {
      "routeId": "route-123",
      "origin": "Douala",
      "destination": "Yaoundé",
      "basePrice": 4500,
      "distance": 250,
      "estimatedDuration": "4.5 hours",
      "availableBuses": 3
    }
  ]
}
```

**TASK: Create Buses Endpoint**

**Endpoint: GET /api/buses**

**Method: getBusesForRoute(UUID routeId, LocalDate date, LocalTime time)**

**Implementation hints:**
- @GetMapping("/buses")
- Query params: routeId, departureDate, departureTime
- Call busService.getAvailableBuses()
- Return list of buses with amenities, capacity, available seats

**TASK: Create Seats Endpoint**

**Endpoint: GET /api/buses/{busId}/seats**

**Method: getAvailableSeats(UUID busId, LocalDate date, LocalTime time)**

**Implementation hints:**
- @GetMapping("/buses/{busId}/seats")
- Path variable: busId
- Query params: departureDate, departureTime
- Call seatService.getAvailableSeats()
- Include seat layout for frontend grid rendering

---

# PART 2: BOOKING MANAGEMENT

## Understanding Booking Creation

**What happens when user clicks "Book"?**

1. User selects: Bus, Seat, Passenger Details
2. User clicks "Confirm Booking"
3. System:
   - Acquires lock on seat (5-minute TTL)
   - Creates draft booking record
   - Returns bookingId to user
4. User proceeds to payment
5. If payment succeeds → Booking becomes "paid"
6. If user exits → Lock expires, seat released

---

## Create Booking Entity & DTOs

**TASK: Create Booking Entity**

**Fields:**
- id (UUID)
- userId (FK to User)
- bookingReference (String) - Format: "GF" + timestamp + random (e.g., "GF202605071030ABC123")
- passengerName, passengerEmail, passengerPhone
- origin, destination, departureDate, departureTime
- busId (FK)
- seatNumber
- totalPrice (calculated based on bus route pricing)
- status (enum: draft, confirmed, pending_payment, paid, cancelled, expired)
- createdAt, updatedAt, expiresAt (for draft expiration)

**Relationships:**
- @ManyToOne with User
- @ManyToOne with Bus
- @OneToOne with Payment (optional)
- @OneToOne with SeatLock (optional)

---

## Create Seat Lock Entity & Service

**TASK: Create SeatLock Entity**

**Fields:**
- id (UUID)
- bookingId (FK)
- busId (FK)
- seatNumber
- departureDate
- lockedAt
- expiresAt (with TTL - auto-deletes after 5 minutes)

**Why this approach?**
- Track which booking locked which seat
- Automatic expiration (TTL) releases seat
- Can query locks to show users "seat X locked for 4 more minutes"

**TASK: Create SeatLockService**

**Method: acquireLock(UUID busId, Integer seatNumber, LocalDate date, LocalTime time, UUID bookingId)**

**Pseudo-code:**
```
1. Check if seat already locked
   - Query seat_locks WHERE busId = busId AND seatNumber = seatNumber
   - If locked AND expiredAt > now() → return error "Seat just taken!"
   - If locked AND expiredAt < now() → delete expired lock

2. Check if seat already booked
   - Query seat_bookings WHERE busId = busId AND seatNumber = seatNumber
   - If found → return error "Seat already booked"

3. Create new lock
   - Create SeatLock record
   - Set expiresAt = now() + 5 minutes
   - Save to database

4. Optional: Store in Redis for faster querying
   - Key: "seat_lock:busId:seatNumber:date"
   - Value: bookingId
   - TTL: 5 minutes (auto-expire)

5. Return success
```

**Method: releaseLock(UUID bookingId)**

**Pseudo-code:**
```
1. Find lock by bookingId
2. Delete lock record
3. Remove from Redis if using Redis
4. Return success
```

**Method: isLocked(UUID busId, Integer seatNumber, LocalDate date)**

**Pseudo-code:**
```
1. Query seat_locks
2. If lock exists AND expiredAt > now() → return true
3. Else → return false
```

---

## Create Booking Service

**TASK: Create BookingService.java**

**Method: createDraftBooking(CreateBookingRequest request)**

**Pseudo-code:**
```
1. Validate user is authenticated
   - Extract userId from JWT token

2. Validate seat is available
   - Call seatLockService.isLocked()
   - Query seat_bookings to confirm not booked

3. Validate booking data
   - Check bus exists
   - Check bus is active (not maintenance)
   - Check date is in future
   - Check passenger details provided

4. Calculate price
   - Get base price from bus_route
   - Apply any discounts (if applicable)
   - totalPrice = basePrice + tax (if applicable)

5. Acquire seat lock
   - Call seatLockService.acquireLock()
   - Lock seat for 5 minutes
   - If lock fails → return error "Seat taken!"

6. Create booking record
   - Generate unique bookingReference
   - Format: "GF" + timestamp (yyyyMMddHHmm) + random(6 chars)
   - Example: "GF202605071030ABC123"
   - Set status = "draft"
   - Set expiresAt = now() + 5 minutes (matches lock expiration)
   - Save to database

7. Return response
   - bookingId, bookingReference, totalPrice, status
```

**Questions to guide:**
- When should price be calculated - at booking or at confirmation?
- What if base price changes between draft and confirmation?
- Should lock and booking have same expiration time?

**Method: confirmBooking(UUID bookingId, ConfirmBookingRequest request)**

**Pseudo-code:**
```
1. Validate user owns this booking
   - Query booking by ID
   - Check userId matches authenticated user
   - If not → return 403 FORBIDDEN

2. Validate booking status is "draft"
   - If status != draft → return error "Cannot confirm non-draft booking"

3. Validate seat lock still exists
   - Query seat_locks by bookingId
   - If not found → return error "Seat lock expired, booking cancelled"

4. Update passenger information
   - Update: passengerName, passengerEmail, passengerPhone
   - (User may have updated these since draft creation)

5. Generate booking reference (if not done during draft)
   - Unique reference for user to track

6. Change booking status to "confirmed"
   - Seat lock remains active!
   - Lock will be released after payment or timeout

7. Return confirmation
   - bookingId, bookingReference, status, totalPrice
   - Include: "Proceed to payment page"
```

**Method: cancelBooking(UUID bookingId)**

**Pseudo-code:**
```
1. Validate user owns this booking

2. Get booking details
   - Query booking by ID

3. Check if refund applicable
   - If status = draft/confirmed → refund = 0 (no charge)
   - If status = paid → Apply refund rules:
     - >24 hrs before departure → 90% refund
     - 24-12 hrs → 75% refund
     - <12 hrs → 50% refund
     - After departure → 0% refund

4. Release seat lock
   - Call seatLockService.releaseLock()
   - Seat becomes available again

5. Delete seat booking
   - Remove from seat_bookings table

6. Update booking status to "cancelled"

7. If refund applicable:
   - Create refund record
   - Initiate payment to user (integrate with payment provider)

8. Log cancellation (audit trail)

9. Send confirmation email/SMS

10. Return response
    - success: true, refundAmount, message
```

**Method: getUserBookings(UUID userId, String status, int limit, int offset)**

**Pseudo-code:**
```
1. Validate JWT token

2. Build query
   - Query bookings WHERE userId = userId
   - If status provided → AND status = status
   - Filter out cancelled bookings (optional - show them?)

3. Apply pagination
   - Skip: offset
   - Take: limit
   - Example: offset=0, limit=10 → Get 0-10

4. Get total count
   - Query count of all matching bookings (without pagination)
   - For UI: "Showing 1-10 of 150 bookings"

5. Fetch booking details
   - Include: bus info, route info, seat number, price, status

6. Sort results
   - By departureDate DESC (most recent first)

7. Return response
   - total: 150
   - bookings: [...]
   - current page info for UI
```

---

## Create Booking API Endpoints

**TASK: Create BookingController.java**

**Endpoint 1: POST /api/bookings/draft**

**Create Draft Booking**

**Implementation hints:**
- @PostMapping("/bookings/draft")
- @Valid @RequestBody CreateBookingRequest
- Requires JWT token (extract userId)
- Call bookingService.createDraftBooking()
- Return 201 CREATED if success

**Request:**
```json
{
  "fullName": "John Doe",
  "phone": "612345678",
  "email": "john@example.com",
  "origin": "Douala",
  "destination": "Yaoundé",
  "departureDate": "2026-05-15",
  "departureTime": "14:00",
  "busId": "bus-123",
  "selectedSeat": 5
}
```

**Response:**
```json
{
  "success": true,
  "bookingId": "booking-456",
  "status": "draft",
  "totalPrice": 4500,
  "message": "Booking draft created. Seat locked for 5 minutes."
}
```

**Endpoint 2: POST /api/bookings/{bookingId}/confirm**

**Confirm Booking**

**Implementation hints:**
- @PostMapping("/bookings/{bookingId}/confirm")
- @PathVariable UUID bookingId
- Requires JWT token
- Call bookingService.confirmBooking()
- Return 200 OK

**Request:**
```json
{
  "passengerName": "John Doe",
  "passengerPhone": "612345678",
  "passengerEmail": "john@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "bookingId": "booking-456",
  "bookingReference": "GF202605071030ABC",
  "status": "confirmed",
  "totalPrice": 4500,
  "message": "Booking confirmed. Proceed to payment."
}
```

**Endpoint 3: DELETE /api/bookings/{bookingId}**

**Cancel Booking**

**Implementation hints:**
- @DeleteMapping("/bookings/{bookingId}")
- @PathVariable UUID bookingId
- Requires JWT token
- Call bookingService.cancelBooking()
- Return 200 OK

**Response:**
```json
{
  "success": true,
  "message": "Booking cancelled successfully",
  "refundAmount": 0
}
```

**Endpoint 4: GET /api/bookings**

**Get User's Bookings**

**Implementation hints:**
- @GetMapping("/bookings")
- Query params: status (optional), limit (default 10), offset (default 0)
- Requires JWT token
- Call bookingService.getUserBookings()
- Return 200 OK

**Request:**
```
GET /api/bookings?status=paid&limit=10&offset=0
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "total": 15,
  "bookings": [
    {
      "bookingId": "booking-123",
      "bookingReference": "GF202605071030ABC",
      "origin": "Douala",
      "destination": "Yaoundé",
      "departureDate": "2026-05-15",
      "departureTime": "14:00",
      "status": "paid",
      "totalPrice": 4500
    }
  ]
}
```

**Endpoint 5: GET /api/bookings/{bookingId}**

**Get Booking Details**

**Implementation hints:**
- @GetMapping("/bookings/{bookingId}")
- @PathVariable UUID bookingId
- Requires JWT token
- Validate ownership (userId matches)
- Return all booking details

---

# PART 3: SEAT MANAGEMENT & LOCKING

## Understanding Race Conditions

**The Problem:**
```
Millisecond 1: User A queries "Is seat 5 available?" → Yes
Millisecond 2: User B queries "Is seat 5 available?" → Yes
Millisecond 3: User A books seat 5 → Success ✓
Millisecond 4: User B books seat 5 → Should fail but doesn't ✗ (DOUBLE BOOKING!)
```

**The Solution - Seat Locks:**
```
Millisecond 1: User A queries "Is seat 5 available?" → Yes
Millisecond 2: User A acquires lock on seat 5 (5-minute TTL)
Millisecond 3: User B queries "Is seat 5 available?" → Locked
Millisecond 4: User B cannot book seat 5
Millisecond 5: User A creates booking → Success ✓
```

**TASK: Implement Database Locks (Alternative to Redis)**

You have 2 options:

**Option 1: Database-Level Locks (Simpler)**
```sql
BEGIN TRANSACTION;
SELECT * FROM seat_locks 
WHERE busId = ? AND seatNumber = ? AND expiresAt > NOW() 
FOR UPDATE NOWAIT;  -- Lock this row immediately

-- If query succeeds, row is locked for this transaction
-- If another transaction has it, get immediate error

-- Then insert your lock:
INSERT INTO seat_locks (...) VALUES (...);

COMMIT;
-- Lock automatically released when transaction ends
```

**Pros:**
- Guaranteed atomicity (all-or-nothing)
- Database handles concurrency
- Simple to understand

**Cons:**
- Slower than Redis
- Database load increases

**Option 2: Redis-Based Locks (Faster)**
```
Use RedisTemplate:
Key: "seat_lock:busId:seatNumber:date"
Value: bookingId
TTL: 5 minutes

Check if locked:
  setnx (set if not exists) with TTL
  If returns true → You got the lock
  If returns false → Lock already held
```

**Recommendation:** Start with Option 1 (database locks) for simplicity. Scale to Redis later if needed.

---

# PART 4: BOOKING CONFIRMATION & CANCELLATION

## Advanced Features to Consider

**1. Refund Calculation Based on Cancellation Time**

**TASK: Create RefundCalculator utility**

```
Rules:
- Draft/Confirmed: 100% refund (free cancellation)
- Paid, >24 hrs before departure: 90% refund
- Paid, 24-12 hrs before departure: 75% refund
- Paid, <12 hrs before departure: 50% refund
- Paid, after departure: 0% refund

Calculate:
departureTime = booking.departureDate + booking.departureTime
nowTime = current timestamp
hoursUntilDeparture = (departureTime - nowTime) / 60 / 60

if status in [draft, confirmed]:
  refund = 0
else if hoursUntilDeparture > 24:
  refund = totalPrice * 0.90
else if hoursUntilDeparture > 12:
  refund = totalPrice * 0.75
else if hoursUntilDeparture > 0:
  refund = totalPrice * 0.50
else:
  refund = 0
```

**2. Booking Expiration (Cron Job)**

**Concept:** Bookings in "draft" state expire after 5 minutes (matching seat lock expiration).

**TASK: Create BookingExpirationService (Scheduled Task)**

```
@Scheduled(fixedDelay = 300000) // Run every 5 minutes
public void expireOldBookings() {
  1. Find all bookings with status = "draft"
  2. Filter where expiresAt < now()
  3. For each expired booking:
     - Release seat lock
     - Delete seat booking
     - Update status to "expired"
     - Mark seat as available
     - Log action
}
```

**Why important?**
- User abandons checkout after selecting seat
- Seat becomes locked for 5 minutes unnecessarily
- After 5 minutes, seat should become available for others

**3. Booking Reference Uniqueness**

**Question:** What if two bookings get same reference?

**Solution:**
```
Reference format: GF + timestamp + random

Example: GF202605071030ABC123
- GF = GoFast prefix
- 202605071030 = May 7, 2026, 10:30 AM
- ABC123 = 6-char random alphanumeric

Probability of collision: Extremely low
But add UNIQUE constraint on bookingReference column in database

Also consider UUID as backup:
@Column(unique=true)
private String bookingReference;
```

---

## Testing Your Implementation

### Manual Testing Scenarios

**Test 1: Complete Booking Flow**
```
1. User searches routes
   GET /api/routes?origin=Douala&destination=Yaoundé&departureDate=2026-05-15

2. Get buses for selected route
   GET /api/buses?routeId=route-123&departureDate=2026-05-15&departureTime=14:00

3. Get seats for selected bus
   GET /api/buses/bus-456/seats?departureDate=2026-05-15&departureTime=14:00

4. Create draft booking
   POST /api/bookings/draft
   Body: {busId, seatNumber, passenger details}
   Response: bookingId, seat is locked

5. Confirm booking
   POST /api/bookings/booking-123/confirm
   Response: bookingReference, ready for payment

6. View confirmed booking
   GET /api/bookings/booking-123
   Check status = "confirmed"

7. (Later) Cancel booking
   DELETE /api/bookings/booking-123
   Check refund calculated correctly
```

**Test 2: Race Condition Test**
```
Simulate two users booking same seat:
1. User A: Acquire lock on seat 5 → Success
2. User B: Try to acquire lock on seat 5 → Should FAIL
3. User A: Confirm booking
4. User B: Seat no longer available
```

**Test 3: Seat Lock Expiration**
```
1. User A: Acquire lock on seat 5 (5-min TTL)
2. Wait 5+ minutes
3. Check seat is available again
4. User B: Can now book seat 5
```

**Test 4: Pagination Test**
```
GET /api/bookings?limit=5&offset=0  → Items 1-5
GET /api/bookings?limit=5&offset=5  → Items 6-10
GET /api/bookings?limit=5&offset=10 → Items 11-15

Verify:
- Total count accurate
- No duplicate items between pages
- Correct items for each offset
```

### Using Postman

**Collection Structure:**
```
GoFast Working Page
├── Routes
│   └── Search Routes
├── Buses
│   ├── Get Buses for Route
│   └── Get Seats for Bus
├── Bookings
│   ├── Create Draft Booking
│   ├── Confirm Booking
│   ├── Get Booking Details
│   ├── Get My Bookings
│   └── Cancel Booking
```

**Environment Variables to Set:**
```
{{base_url}} = http://localhost:8080/api
{{token}} = JWT token from login
{{routeId}} = route-123
{{busId}} = bus-456
{{bookingId}} = booking-789
```

---

## Common Issues & Debugging

**Issue: "Seat not available" error but no one booked it**

**Cause:** Seat lock still exists from previous booking attempt

**Debug:**
1. Check seat_locks table
2. Look for entry with same busId, seatNumber
3. Check expiresAt timestamp
4. If expired, cron job should have cleaned it up
5. Solution: Ensure cron job runs correctly

**Issue: Booking reference duplicated**

**Cause:** Multiple bookings getting same reference

**Debug:**
1. Check bookingReference format
2. Verify random component is truly random
3. Add UNIQUE constraint to database
4. Log all generated references

**Issue: Refund calculated incorrectly**

**Cause:** Timezone or time calculation error

**Debug:**
```java
// Log all values:
log.info("Now: {}", LocalDateTime.now());
log.info("Departure: {}", booking.getDepartureDateTime());
log.info("Hours until: {}", hoursUntilDeparture);
log.info("Refund %: {}", refundPercentage);
log.info("Refund amount: {}", refundAmount);
```

**Issue: Pagination returns wrong items**

**Cause:** Offset calculation wrong, or sorting not applied

**Debug:**
```
Expected for offset=10, limit=5:
- Skip first 10
- Take next 5
- Show items 11-15

If getting items 1-5 instead:
- Check @Pageable is applied
- Check limit is used in query
- Check offset is used as skip value
```

---

## Summary & Next Steps

**What You've Built:**
1. Route search with real-time availability
2. Bus selection with seat layouts
3. Interactive seat locking (5-minute TTL)
4. Draft booking creation
5. Booking confirmation workflow
6. Booking cancellation with refunds
7. User booking history with pagination

**Security Checklist:**
- ✅ JWT token validation on all endpoints
- ✅ Ownership validation (users see only their bookings)
- ✅ Input validation on all requests
- ✅ Seat locks prevent double-booking
- ✅ Booking reference uniqueness
- ✅ Audit logging of all changes

**Performance Optimizations to Consider:**
- Cache route searches for 1 hour
- Index frequently queried columns (origin, destination, departureDate)
- Connection pooling for database
- Async seat lock cleanup (background job)
- Redis caching for seat availability

**Testing Best Practices:**
1. Test happy path first (everything works)
2. Test edge cases (boundary conditions)
3. Test error cases (invalid input, missing resources)
4. Test concurrency (two users simultaneously)
5. Test performance (large datasets)

Good luck implementing! 🚀
