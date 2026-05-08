# GoFast Backend Requirements & Architecture

## Overview
This document outlines all backend functionalities, API endpoints, database schemas, and business logic required to support the GoFast bus ticketing platform frontend.

---

## 1. Authentication & User Management

### 1.1 User Registration (Sign Up)
**Endpoint:** `POST /api/auth/signup`

**Request Body:**
```json
{
  "fullName": "string",
  "email": "string (unique)",
  "password": "string (min 8 chars)",
  "phone": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Account created successfully",
  "userId": "UUID",
  "token": "JWT token",
  "user": {
    "id": "UUID",
    "name": "string",
    "email": "string",
    "phone": "string"
  }
}
```

**Logic:**
- Validate email format and uniqueness in database
- Hash password using bcrypt (min 10 salt rounds)
- Check for duplicate email before creation
- Generate JWT token with 7-day expiration
- Create user record in database
- Log signup event for analytics

**Database Field:**
```
users table:
- id (UUID, primary key)
- fullName (string, not null)
- email (string, unique, not null)
- passwordHash (string, not null)
- phone (string, nullable)
- createdAt (timestamp)
- updatedAt (timestamp)
- lastLogin (timestamp, nullable)
- isActive (boolean, default: true)
```

---

### 1.2 User Login
**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "JWT token",
  "user": {
    "id": "UUID",
    "name": "string",
    "email": "string"
  }
}
```

**Logic:**
- Validate email exists in database
- Compare provided password with stored hash using bcrypt
- If credentials invalid, return 401 Unauthorized
- Generate JWT token (7-day expiration)
- Update lastLogin timestamp
- Return token to frontend for subsequent requests

**Error Handling:**
- Invalid email: Return generic "Invalid credentials" (for security)
- Invalid password: Return generic "Invalid credentials"
- Inactive account: Return "Account suspended"

---

### 1.3 Logout
**Endpoint:** `POST /api/auth/logout`

**Request Headers:**
```
Authorization: Bearer <JWT token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Logic:**
- Validate JWT token
- Add token to blacklist (Redis cache with TTL = token expiration)
- Clear user session if using sessions
- Frontend clears stored token

**Token Blacklist (Redis):**
```
Key: blacklist:<tokenId>
Value: true
TTL: token expiration time
```

---

### 1.4 Token Refresh
**Endpoint:** `POST /api/auth/refresh`

**Request Body:**
```json
{
  "refreshToken": "string"
}
```

**Response:**
```json
{
  "success": true,
  "accessToken": "new JWT token",
  "refreshToken": "new refresh token"
}
```

**Logic:**
- Validate refresh token
- Generate new access token (short expiration: 1 hour)
- Generate new refresh token (long expiration: 7 days)
- Return both tokens

**Database Field (users table):**
- refreshTokenHash (string, nullable)
- refreshTokenExpiry (timestamp, nullable)

---

## 2. Route & Bus Management

### 2.1 Get Available Routes
**Endpoint:** `GET /api/routes`

**Query Parameters:**
```
origin: string (required)
destination: string (required)
departureDate: string (YYYY-MM-DD, required)
```

**Response:**
```json
{
  "success": true,
  "routes": [
    {
      "routeId": "UUID",
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

**Logic:**
- Query routes table filtering by origin, destination, and date
- Calculate base price based on distance
- Count available seats for each bus on that route
- Return only routes with available buses
- Cache results for 1 hour

**Database Tables:**
```
routes table:
- id (UUID, primary key)
- origin (string, not null)
- destination (string, not null)
- distance (float, in km)
- basePrice (integer, in CFA)
- estimatedDuration (string)
- isActive (boolean, default: true)
- createdAt (timestamp)

route_schedules table:
- id (UUID, primary key)
- routeId (UUID, foreign key)
- departureDate (date)
- departureTime (time)
- expectedArrivalTime (time)
- isActive (boolean, default: true)
```

---

### 2.2 Get Buses for Route
**Endpoint:** `GET /api/buses`

**Query Parameters:**
```
routeId: UUID (required)
departureDate: string (YYYY-MM-DD, required)
departureTime: string (HH:MM, required)
```

**Response:**
```json
{
  "success": true,
  "buses": [
    {
      "busId": "UUID",
      "busName": "Bus 101 - Executive",
      "capacity": 16,
      "type": "executive",
      "amenities": ["AC", "WiFi", "USB Charging"],
      "availableSeats": 8,
      "price": 4500,
      "operator": "GoldenBus Transport"
    }
  ]
}
```

**Logic:**
- Query buses table for given route and time
- Count available (unbooked) seats
- Return bus details with pricing
- Filter out buses with 0 available seats (optional)

**Database Tables:**
```
buses table:
- id (UUID, primary key)
- name (string)
- licensePlate (string, unique)
- capacity (integer)
- type (enum: executive, standard, luxury)
- operatorId (UUID, foreign key)
- status (enum: active, maintenance, retired)
- createdAt (timestamp)

bus_amenities table:
- id (UUID, primary key)
- busId (UUID, foreign key)
- amenity (string: AC, WiFi, USB, Toilet, etc)

bus_routes table:
- id (UUID, primary key)
- busId (UUID, foreign key)
- routeId (UUID, foreign key)
- departureDate (date)
- departureTime (time)
- currentBookedSeats (integer, default: 0)
```

---

### 2.3 Get Available Seats
**Endpoint:** `GET /api/buses/:busId/seats`

**Query Parameters:**
```
departureDate: string (YYYY-MM-DD)
departureTime: string (HH:MM)
```

**Response:**
```json
{
  "success": true,
  "busId": "UUID",
  "totalSeats": 16,
  "bookedSeats": [2, 5, 8, 12],
  "availableSeats": [1, 3, 4, 6, 7, 9, 10, 11, 13, 14, 15, 16],
  "layout": {
    "rows": 4,
    "seatsPerRow": 4,
    "aislePosition": 2
  }
}
```

**Logic:**
- Query seat_bookings table for bus on specific date/time
- Return list of booked seat numbers
- Calculate available seats (total - booked)
- Return bus layout configuration for frontend rendering

**Database Tables:**
```
seats table:
- id (UUID, primary key)
- busId (UUID, foreign key)
- seatNumber (integer, 1-16)
- row (integer)
- column (integer)
- seatType (enum: window, aisle)

seat_bookings table:
- id (UUID, primary key)
- bookingId (UUID, foreign key)
- busId (UUID, foreign key)
- seatNumber (integer)
- departureDate (date)
- departureTime (time)
- bookedAt (timestamp)
```

---

## 3. Booking Management

### 3.1 Create Booking (Draft)
**Endpoint:** `POST /api/bookings/draft`

**Request Headers:**
```
Authorization: Bearer <JWT token>
```

**Request Body:**
```json
{
  "fullName": "string",
  "phone": "string",
  "email": "string",
  "origin": "string",
  "destination": "string",
  "departureDate": "string (YYYY-MM-DD)",
  "departureTime": "string (HH:MM)",
  "busId": "UUID",
  "selectedSeat": "integer"
}
```

**Response:**
```json
{
  "success": true,
  "bookingId": "UUID",
  "status": "draft",
  "totalPrice": 4500,
  "message": "Booking draft created. Proceed to payment."
}
```

**Logic:**
- Validate JWT token (user authenticated)
- Check if seat is still available (race condition check)
- Lock seat temporarily (5-minute lock)
- Create booking record with status "draft"
- Calculate total price
- Store booking data in database

**Database Tables:**
```
bookings table:
- id (UUID, primary key)
- userId (UUID, foreign key)
- bookingReference (string, unique, format: GF + timestamp + random)
- passengerName (string)
- passengerPhone (string)
- passengerEmail (string)
- origin (string)
- destination (string)
- departureDate (date)
- departureTime (time)
- busId (UUID, foreign key)
- seatNumber (integer)
- totalPrice (integer)
- status (enum: draft, confirmed, pending_payment, paid, cancelled)
- createdAt (timestamp)
- updatedAt (timestamp)
- expiresAt (timestamp, for draft expiration)

seat_locks table:
- id (UUID, primary key)
- bookingId (UUID, foreign key)
- busId (UUID, foreign key)
- seatNumber (integer)
- departureDate (date)
- lockedAt (timestamp)
- expiresAt (timestamp, 5 minutes from now)
```

**Seat Locking Logic:**
- Before saving booking, acquire lock on seat
- If lock exists and valid (< 5 min old), return "Seat just booked"
- Create lock with 5-minute expiration
- On booking confirmation, convert lock to actual booking
- On timeout, release lock automatically (cron job or TTL)

---

### 3.2 Confirm Booking (Review Page)
**Endpoint:** `POST /api/bookings/:bookingId/confirm`

**Request Headers:**
```
Authorization: Bearer <JWT token>
```

**Request Body:**
```json
{
  "passengerName": "string",
  "passengerPhone": "string",
  "passengerEmail": "string"
}
```

**Response:**
```json
{
  "success": true,
  "bookingId": "UUID",
  "bookingReference": "GF1234567890-123",
  "status": "confirmed",
  "totalPrice": 4500,
  "message": "Booking confirmed. Proceed to payment."
}
```

**Logic:**
- Validate booking exists and belongs to user
- Validate booking status is "draft"
- Update passenger information
- Change booking status to "confirmed"
- Seat lock remains active (will be released after payment timeout)
- Generate unique booking reference
- Return booking reference for payment

---

### 3.3 Cancel Booking
**Endpoint:** `DELETE /api/bookings/:bookingId`

**Request Headers:**
```
Authorization: Bearer <JWT token>
```

**Response:**
```json
{
  "success": true,
  "message": "Booking cancelled successfully",
  "refundAmount": 0
}
```

**Logic:**
- Validate booking exists and belongs to user
- If status is "draft" or "confirmed": Cancel, refund 100%
- If status is "paid": Cancel, refund 90% (10% cancellation fee)
- If status is "pending_payment": Cancel, no refund needed
- Update booking status to "cancelled"
- Release seat lock
- Record cancellation in audit log

**Cancellation Rules:**
```
- Draft/Confirmed: Free cancellation
- Paid (>24 hrs before departure): 90% refund
- Paid (24-12 hrs before departure): 75% refund
- Paid (<12 hrs before departure): 50% refund
- Paid (after departure): No refund
```

---

### 3.4 Get Booking Details
**Endpoint:** `GET /api/bookings/:bookingId`

**Request Headers:**
```
Authorization: Bearer <JWT token>
```

**Response:**
```json
{
  "success": true,
  "booking": {
    "bookingId": "UUID",
    "bookingReference": "GF1234567890-123",
    "passengerName": "John Doe",
    "passengerEmail": "john@example.com",
    "origin": "Douala",
    "destination": "Yaoundé",
    "departureDate": "2026-05-15",
    "departureTime": "14:00",
    "seatNumber": 5,
    "totalPrice": 4500,
    "status": "paid",
    "paymentMethod": "MTN Mobile Money",
    "createdAt": "2026-05-07T10:30:00Z"
  }
}
```

**Logic:**
- Validate JWT token
- Check booking belongs to authenticated user
- Fetch booking details
- Return all relevant information

---

### 3.5 Get User's Bookings
**Endpoint:** `GET /api/bookings`

**Request Headers:**
```
Authorization: Bearer <JWT token>
```

**Query Parameters:**
```
status: string (optional: draft, confirmed, paid, cancelled)
limit: integer (default: 10)
offset: integer (default: 0)
```

**Response:**
```json
{
  "success": true,
  "total": 15,
  "bookings": [
    {
      "bookingId": "UUID",
      "bookingReference": "GF1234567890-123",
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

**Logic:**
- Validate JWT token
- Query bookings for authenticated user
- Filter by status if provided
- Apply pagination (limit & offset)
- Return paginated results with total count

---

## 4. Payment Processing

### 4.1 Initiate Payment
**Endpoint:** `POST /api/payments/initiate`

**Request Headers:**
```
Authorization: Bearer <JWT token>
```

**Request Body:**
```json
{
  "bookingId": "UUID",
  "paymentMethod": "string (mtn or orange)",
  "phoneNumber": "string (format: 6XXXXXXXX)"
}
```

**Response:**
```json
{
  "success": true,
  "paymentId": "UUID",
  "transactionId": "string",
  "status": "pending",
  "amount": 4500,
  "message": "Payment initiated. Waiting for mobile money confirmation."
}
```

**Logic:**
- Validate booking exists and status is "confirmed"
- Validate phone number format for Cameroon (6XXXXXXXX)
- Validate payment method (MTN or Orange)
- Call mobile money provider API (MTN MOMO API or Orange Money API)
- Create payment record in database
- Return transaction ID to frontend
- Store payment in "pending" status

**Database Tables:**
```
payments table:
- id (UUID, primary key)
- bookingId (UUID, foreign key, unique)
- transactionId (string, unique)
- paymentMethod (enum: mtn, orange)
- phoneNumber (string)
- amount (integer)
- status (enum: pending, success, failed, timeout)
- provider (string)
- providerReference (string)
- createdAt (timestamp)
- completedAt (timestamp, nullable)
- metadata (JSON)

payment_logs table:
- id (UUID, primary key)
- paymentId (UUID, foreign key)
- event (string)
- response (JSON)
- timestamp (timestamp)
```

---

### 4.2 Verify Payment
**Endpoint:** `POST /api/payments/:paymentId/verify`

**Request Headers:**
```
Authorization: Bearer <JWT token>
```

**Response:**
```json
{
  "success": true,
  "status": "success",
  "message": "Payment verified successfully",
  "bookingId": "UUID",
  "bookingReference": "GF1234567890-123"
}
```

**Logic:**
- Query payment provider API for transaction status
- If payment successful:
  - Update payment status to "success"
  - Update booking status to "paid"
  - Release seat lock (convert to actual booking)
  - Send confirmation SMS/email
  - Generate ticket
  - Return success
- If payment failed:
  - Update payment status to "failed"
  - Update booking status to "draft"
  - Release seat lock
  - Return error
- If payment timeout (> 10 minutes):
  - Update payment status to "timeout"
  - Release seat lock
  - Return timeout error

---

### 4.3 Handle Webhook (Payment Confirmation)
**Endpoint:** `POST /api/webhooks/payment`

**Request Body (from Provider):**
```json
{
  "transactionId": "string",
  "status": "success or failed",
  "amount": "integer",
  "phoneNumber": "string",
  "timestamp": "string"
}
```

**Response:**
```json
{
  "success": true,
  "received": true
}
```

**Logic:**
- Verify webhook signature from provider (security)
- Find payment by transaction ID
- If status "success":
  - Update payment to "success"
  - Update booking to "paid"
  - Release seat lock
  - Send confirmation email/SMS
  - Log payment event
- If status "failed":
  - Update payment to "failed"
  - Release seat lock
  - Log payment event
- Respond with 200 OK to acknowledge receipt
- Store webhook in logs for debugging

---

## 5. Ticket Generation & Management

### 5.1 Generate Ticket
**Endpoint:** `GET /api/tickets/:bookingId`

**Request Headers:**
```
Authorization: Bearer <JWT token>
```

**Response:**
```json
{
  "success": true,
  "ticket": {
    "ticketId": "UUID",
    "ticketNumber": "GF1234567890-123-001",
    "bookingReference": "GF1234567890-123",
    "passengerName": "John Doe",
    "origin": "Douala",
    "destination": "Yaoundé",
    "departureDate": "2026-05-15",
    "departureTime": "14:00",
    "busLicensePlate": "CM-XXXXX",
    "seatNumber": 5,
    "operatorName": "GoldenBus Transport",
    "operatorPhone": "+237655XXXXXX",
    "pickupLocation": "Downtown Douala Station",
    "qrCode": "data:image/png;base64,...",
    "barcode": "data:image/png;base64,...",
    "generatedAt": "2026-05-07T14:30:00Z"
  }
}
```

**Logic:**
- Validate booking exists and status is "paid"
- Generate unique ticket number
- Generate QR code containing booking reference + checksum
- Generate barcode from ticket number
- Create ticket record in database
- Return ticket with encoded images (base64)
- Frontend can print or share ticket

**Database Tables:**
```
tickets table:
- id (UUID, primary key)
- bookingId (UUID, foreign key, unique)
- ticketNumber (string, unique)
- qrCodeData (string)
- barcodeData (string)
- generatedAt (timestamp)
- usedAt (timestamp, nullable)
- isValid (boolean, default: true)
```

---

### 5.2 Validate Ticket (At Bus Station)
**Endpoint:** `POST /api/tickets/validate`

**Request Body:**
```json
{
  "ticketNumber": "string",
  "qrCode": "string (scanned)"
}
```

**Response:**
```json
{
  "success": true,
  "isValid": true,
  "passenger": "John Doe",
  "seatNumber": 5,
  "origin": "Douala",
  "destination": "Yaoundé",
  "departureTime": "14:00",
  "message": "Ticket valid. Passenger may board."
}
```

**Logic:**
- Validate QR code format
- Decrypt QR code to get booking reference
- Query booking by reference
- Verify ticket not already used
- Verify departure time not passed (within 2 hours before departure)
- Mark ticket as used if validation successful
- Return ticket details for bus operator

---

## 6. Admin Dashboard

### 6.1 Admin Authentication
**Endpoint:** `POST /api/admin/login`

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "token": "JWT token (extended expiration)",
  "user": {
    "id": "UUID",
    "email": "string",
    "role": "admin",
    "permissions": ["view_bookings", "manage_buses", "manage_routes", ...]
  }
}
```

**Logic:**
- Same as user login but with role check
- Only users with "admin" role can access
- JWT token has longer expiration (30 days)
- Track admin login attempts for security audit

**Database Field (users table):**
- role (enum: user, admin, operator)
- permissions (JSON array)

---

### 6.2 Get All Bookings
**Endpoint:** `GET /api/admin/bookings`

**Request Headers:**
```
Authorization: Bearer <admin JWT token>
```

**Query Parameters:**
```
status: string (optional)
origin: string (optional)
destination: string (optional)
startDate: string (optional)
endDate: string (optional)
limit: integer (default: 50)
offset: integer (default: 0)
sortBy: string (default: createdAt)
sortOrder: string (asc or desc)
```

**Response:**
```json
{
  "success": true,
  "total": 1250,
  "bookings": [
    {
      "bookingId": "UUID",
      "bookingReference": "GF1234567890-123",
      "passengerName": "John Doe",
      "origin": "Douala",
      "destination": "Yaoundé",
      "departureDate": "2026-05-15",
      "totalPrice": 4500,
      "status": "paid",
      "createdAt": "2026-05-07T10:30:00Z"
    }
  ]
}
```

**Logic:**
- Verify admin role
- Apply all filters to query
- Paginate results
- Sort by specified field
- Return total count + results

---

### 6.3 Get Dashboard Statistics
**Endpoint:** `GET /api/admin/stats`

**Request Headers:**
```
Authorization: Bearer <admin JWT token>
```

**Query Parameters:**
```
startDate: string (YYYY-MM-DD, optional)
endDate: string (YYYY-MM-DD, optional)
period: string (day, week, month)
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalBookings": 1250,
    "totalRevenue": 5625000,
    "confirmedBookings": 1000,
    "pendingPayments": 50,
    "cancelledBookings": 100,
    "uniquePassengers": 892,
    "topRoute": {
      "route": "Douala → Yaoundé",
      "bookings": 245,
      "revenue": 1102500
    },
    "topBus": {
      "name": "Bus 101",
      "bookings": 87,
      "capacity": 16,
      "utilization": "98%"
    },
    "averageOccupancy": "87.5%",
    "revenueChart": [
      { "date": "2026-05-01", "revenue": 125000 },
      { "date": "2026-05-02", "revenue": 143000 }
    ],
    "bookingsByStatus": {
      "paid": 1000,
      "pending_payment": 50,
      "cancelled": 100,
      "draft": 100
    }
  }
}
```

**Logic:**
- Verify admin role
- Query bookings table with date filters
- Calculate metrics:
  - Total bookings count
  - Sum total revenue (paid bookings only)
  - Count by status
  - Unique passengers count
  - Top route by bookings
  - Top bus by utilization
  - Average seat occupancy
  - Revenue trend over period
- Cache results for 1 hour
- Return all statistics

---

### 6.4 Manage Buses
**Endpoint:** `GET/POST/PUT /api/admin/buses`

**GET - List Buses:**
```json
{
  "success": true,
  "buses": [
    {
      "busId": "UUID",
      "name": "Bus 101",
      "licensePlate": "CM-XXXXX",
      "capacity": 16,
      "type": "executive",
      "operatorId": "UUID",
      "status": "active",
      "totalTrips": 245,
      "totalRevenue": 1102500
    }
  ]
}
```

**POST - Add Bus:**
```json
{
  "busId": "UUID",
  "name": "string",
  "licensePlate": "string",
  "capacity": "integer",
  "type": "enum",
  "operatorId": "UUID",
  "amenities": ["AC", "WiFi"]
}
```

**PUT - Update Bus:**
```json
{
  "status": "enum: active, maintenance, retired"
}
```

**Logic:**
- Verify admin role
- For POST: Validate unique license plate, validate operator exists
- For PUT: Update only allowed fields
- Log all changes to audit table

---

### 6.5 Manage Routes
**Endpoint:** `GET/POST/PUT /api/admin/routes`

Similar structure to buses management

**Logic:**
- Add/edit routes with price and distance
- Validate origin and destination exist
- Archive old routes instead of deleting
- Track changes in audit log

---

## 7. Notifications & Communications

### 7.1 Send Confirmation Email
**Trigger:** Payment successful

**Email Content:**
```
Subject: Your GoFast Ticket Confirmation - [Booking Reference]

Body:
Dear [Passenger Name],

Your booking has been confirmed!

Route: [Origin] → [Destination]
Date: [Departure Date]
Time: [Departure Time]
Seat: [Seat Number]
Price: [Total Price] CFA

Booking Reference: [Reference]
Ticket Number: [Ticket Number]

Your ticket is attached. Please present it at the station 30 minutes before departure.

Questions? Contact us at support@gofast.cm
```

**Logic:**
- Use email service (SendGrid, AWS SES, etc)
- Attach ticket as PDF or QR code
- Send immediately after payment success
- Log email sending in database
- Implement retry logic (3 attempts)

**Database:**
```
notifications table:
- id (UUID, primary key)
- bookingId (UUID, foreign key)
- type (enum: email, sms)
- recipient (string)
- subject (string)
- content (string)
- status (enum: pending, sent, failed)
- sentAt (timestamp, nullable)
- retryCount (integer, default: 0)
- createdAt (timestamp)
```

---

### 7.2 Send Confirmation SMS
**Trigger:** Payment successful

**SMS Content:**
```
GoFast: Your ticket to [Origin]-[Destination] on [Date] at [Time] is confirmed. 
Seat: [Seat#]. Ref: [Booking Ref]. Have a great trip!
```

**Logic:**
- Use SMS service (Twilio, Africastalking, etc)
- Send immediately after payment
- Include booking reference in message
- Log SMS sending
- Implement retry logic

---

### 7.3 Send Reminder SMS
**Trigger:** 2 hours before departure

**SMS Content:**
```
Reminder: Your GoFast bus from [Origin] to [Destination] departs in 2 hours from [Station].
Seat [#]. See you there!
```

**Logic:**
- Cron job runs every 30 minutes
- Query bookings with departure time in next 2-3 hours
- Check if reminder not already sent
- Send SMS
- Mark reminder as sent in database

---

## 8. Data Integrity & Security

### 8.1 Seat Lock Expiration
**Process:** Cron job (runs every 5 minutes)

**Logic:**
```
1. Query seat_locks table
2. Find locks older than 5 minutes
3. For each expired lock:
   - Delete lock record
   - Update booking status to "cancelled" if still "draft"
   - Log action
4. Release seats back to available pool
```

---

### 8.2 Payment Timeout
**Process:** Cron job (runs every minute)

**Logic:**
```
1. Query payments with status "pending"
2. Find payments older than 10 minutes
3. For each timeout payment:
   - Update payment status to "timeout"
   - Update booking status to "draft"
   - Release seat lock
   - Log action
4. Notify user (optional)
```

---

### 8.3 Session Management
**JWT Token Strategy:**
- Access Token: 1 hour expiration
- Refresh Token: 7 days expiration
- Token stored in Redis for blacklist check
- Implement token rotation on refresh

**Validation:**
```
Every request with auth:
1. Extract token from Authorization header
2. Verify JWT signature
3. Check token not in blacklist
4. Verify token not expired
5. Extract userId and role
6. Proceed with request
```

---

### 8.4 Input Validation & Sanitization
**For all endpoints:**
- Validate email format (regex or library)
- Validate phone number format (starts with 6, 9 digits)
- Sanitize strings (remove SQL injection attempts)
- Validate date/time formats
- Check field lengths
- Reject unknown fields
- Use parameterized queries (prevent SQL injection)

---

### 8.5 Rate Limiting
**Apply to:**
- Login endpoint: 5 attempts per 15 minutes per IP
- Payment initiation: 3 attempts per hour per user
- API endpoints: 100 requests per minute per authenticated user

**Implementation:**
- Use Redis for rate limit tracking
- Return 429 Too Many Requests when exceeded

---

## 9. Audit Logging

### 9.1 Audit Log
**Log Events:**
- User login/logout
- Booking creation/cancellation
- Payment success/failure
- Admin actions (delete, update)
- Failed authentication attempts
- Suspicious activities

**Database Table:**
```
audit_logs table:
- id (UUID, primary key)
- userId (UUID, foreign key, nullable)
- action (string)
- resource (string)
- resourceId (UUID, nullable)
- details (JSON)
- ipAddress (string)
- userAgent (string)
- timestamp (timestamp)
```

---

## 10. Deployment & Infrastructure

### Required Services:
1. **Database:** PostgreSQL (primary data store)
2. **Cache:** Redis (session, rate limiting, caching)
3. **Email:** SendGrid or AWS SES
4. **SMS:** Twilio, Africastalking, or local provider
5. **Payment Integration:** MTN MOMO API, Orange Money API
6. **Cloud Hosting:** AWS, Azure, or DigitalOcean
7. **File Storage:** S3 or similar for tickets/PDFs
8. **Monitoring:** Sentry, DataDog, or similar

### Environment Variables Required:
```
DATABASE_URL=
REDIS_URL=
JWT_SECRET=
JWT_REFRESH_SECRET=
EMAIL_SERVICE_KEY=
SMS_SERVICE_KEY=
MTN_MOMO_API_KEY=
ORANGE_MONEY_API_KEY=
AWS_ACCESS_KEY=
AWS_SECRET_KEY=
```

---

## 11. API Error Handling

**Standard Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "string (e.g., INVALID_CREDENTIALS, SEAT_NOT_AVAILABLE)",
    "message": "string (user-friendly message)",
    "details": "string (technical details, admin only)"
  }
}
```

**HTTP Status Codes:**
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 409: Conflict (e.g., seat already booked)
- 429: Too Many Requests
- 500: Server Error
- 503: Service Unavailable

---

## Summary

This backend architecture covers:
✅ User authentication & authorization
✅ Route & bus management
✅ Booking lifecycle (draft → confirmed → paid)
✅ Real-time seat availability
✅ Secure payment processing
✅ Ticket generation & validation
✅ Admin dashboard
✅ Notifications (email/SMS)
✅ Data integrity & security
✅ Audit logging
✅ Error handling

Ready to implement? You'll need a backend team to develop these services (Node.js/Express, Python/Django, Java/Spring, or similar). The frontend is already prepared to consume these APIs!
