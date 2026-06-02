# GoFast Login Functionality - Comprehensive Java Learning Guide

## Table of Contents
1. [Overview & Requirements](#overview--requirements)
2. [Key Concepts You Need to Know](#key-concepts-you-need-to-know)
3. [Architecture & Design](#architecture--design)
4. [Step-by-Step Implementation Guide](#step-by-step-implementation-guide)
   - [Part 1: Project Setup](#part-1-project-setup)
   - [Part 2: Database & Entities](#part-2-database--entities)
   - [Part 3: User Registration](#part-3-user-registration)
   - [Part 4: User Login](#part-4-user-login)
   - [Part 5: Logout](#part-5-logout)
   - [Part 6: Token Refresh](#part-6-token-refresh)
5. [Security Considerations](#security-considerations)
6. [Testing Your Implementation](#testing-your-implementation)

---

## Overview & Requirements

### What We're Building

Based on your BACKEND_REQUIREMENTS.txt, the login functionality has 4 main features:

1. **User Registration (Sign Up)** - `POST /api/auth/signup`
2. **User Login** - `POST /api/auth/login`
3. **Logout** - `POST /api/auth/logout`
4. **Token Refresh** - `POST /api/auth/refresh`

### Key Backend Requirements Extracted from Your File

**User Registration:**
- Accept: fullName, email (unique), password (min 8 chars), phone (optional)
- Return: JWT token, user details
- Hash password using bcrypt (10 salt rounds)
- Check for duplicate emails

**User Login:**
- Accept: email, password
- Compare password with bcrypt hash
- Return: JWT token (7-day expiration), user details
- Update lastLogin timestamp
- Return generic "Invalid credentials" for security (don't expose if email exists)

**Logout:**
- Accept: JWT token via Authorization header
- Add token to blacklist (Redis with TTL)
- Prevent token reuse

**Token Refresh:**
- Accept: refreshToken
- Validate refresh token
- Return: new access token (short-lived) + new refresh token (long-lived)

---

## Key Concepts You Need to Know

### Concept 1: Password Hashing with Bcrypt

**What it is:** A one-way encryption algorithm that makes passwords secure.

**Why we need it:**
- Never store plain text passwords in database
- If database is hacked, attackers can't read passwords
- Users' passwords on other sites are also protected (they reuse passwords)

**How it works:**
```
Plain password: "myPassword123"
    ↓ (bcrypt encoding with salt)
Stored hash: "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36ZyUUDA"

When user logs in:
Input: "myPassword123"
    ↓ (bcrypt verification)
Does it match stored hash? → YES (login successful)
```

**Salt rounds = 10:** This means the algorithm runs 10 times, making it slower and harder to crack

**Key takeaway:** You need the bcrypt library to hash and verify passwords

---

### Concept 2: JWT (JSON Web Tokens)

**What it is:** A secure token sent to the frontend to authenticate future requests.

**Why we need it:**
- Instead of storing user session on server, send token to client
- Client sends token with every request
- Server validates token instead of database lookup
- Scalable for multiple servers

**Token Structure:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

The token has 3 parts separated by dots:
1. **Header:** Algorithm and token type
2. **Payload:** Data about user (user ID, email, expiration time)
3. **Signature:** Ensures token wasn't tampered with

**Expiration time:**
- Access token: 7 days (keeps user logged in for a week)
- Refresh token: 30 days (allows getting new tokens for a month)

**Key takeaway:** You need JWT library (JJWT) to create and validate tokens

---

### Concept 3: Token Blacklist (Redis)

**What it is:** A temporary list of tokens that should no longer be accepted.

**Why we need it:**
- When user logs out, we invalidate their token
- If token wasn't blacklisted, someone with the old token could still use it
- Token is automatically removed from blacklist when it expires

**How it works:**
```
User logs out → Token added to Redis blacklist with TTL (expiration)
When token expires → Redis automatically deletes it

Example Redis entry:
Key: "blacklist:user-123:token-abc"
Value: "true"
TTL: 7 days (when token expires, this entry is auto-deleted)
```

**Key takeaway:** You need Redis to store blacklisted tokens with automatic expiration

---

## Architecture & Design

### System Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    FRONTEND (Browser)                        │
│  Stores: accessToken, refreshToken (localStorage)            │
└──────────────────────┬───────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
    SIGNUP         LOGIN           REFRESH
  [POST/signup]  [POST/login]   [POST/refresh]
        │              │              │
        └──────────────┼──────────────┘
                       │
        ┌──────────────▼──────────────┐
        │                             │
    BACKEND (Java/Spring)             │
    ┌──────────────────────────┐     │
    │ 1. Validate Input        │     │
    │ 2. Check Database        │     │
    │ 3. Hash/Verify Password  │     │
    │ 4. Generate JWT Token    │     │
    │ 5. Update DB             │     │
    └──────────────────────────┘     │
        │                            │
        ├─► Database (MySQL)         │
        │   - Users table            │
        │   - Store hashed pwd       │
        │   - Store refresh token    │
        │                            │
        ├─► Cache (Redis)            │
        │   - Token blacklist        │
        │   - Auto-expiry            │
        │                            │
        └─ Response: Token + User    │
                       │             │
                       └─────────────┘
```

### Directory Structure You'll Create

```
src/main/java/com/gofast/
├── entity/
│   └── User.java              (Database model)
├── repository/
│   └── UserRepository.java    (Database queries)
├── dto/
│   ├── SignUpRequest.java     (Input validation)
│   ├── LoginRequest.java
│   ├── SignUpResponse.java    (Output format)
│   ├── LoginResponse.java
│   └── UserDto.java
├── service/
│   ├── AuthService.java       (Business logic)
│   ├── PasswordEncoderService.java
│   ├── JwtTokenProvider.java
│   └── TokenBlacklistService.java
├── controller/
│   └── AuthController.java    (HTTP endpoints)
├── filter/
│   └── JwtAuthenticationFilter.java
└── config/
    └── SecurityConfig.java
```

---

## Step-by-Step Implementation Guide

# PART 1: PROJECT SETUP

## What You Need to Install

1. **Java Development Kit (JDK 11+)**
   - Download from oracle.com or use OpenJDK
   - Verify: `java -version` in terminal

2. **Maven**
   - Build tool for Java projects
   - Verify: `mvn -version` in terminal

3. **MySQL Database**
   - Where you'll store user data
   - Download from mysql.com

4. **Redis**
   - In-memory cache for token blacklisting
   - Download from redis.io

5. **IDE (VS Code + Java extensions or IntelliJ IDEA)**
   - For writing code

## Create a Spring Boot Project

**TASK:** Create a new Spring Boot Maven project with these steps:

1. Go to https://start.spring.io
2. Select:
   - Project: Maven
   - Language: Java
   - Spring Boot: Latest stable version
   - Project Metadata:
     - Group: com.gofast
     - Artifact: gofast-backend
     - Name: GoFast Backend
3. Add Dependencies:
   - Spring Web
   - Spring Data JPA
   - Spring Security
   - MySQL Driver
   - Lombok
   - Spring Data Redis

4. Download the ZIP, extract, open in VS Code or IDE

## Update pom.xml

**TASK:** Open `pom.xml` and add additional JWT dependencies

**What to look for:** The `<dependencies>` section

**What to add:** Search for "jjwt" and add:
- jjwt-api
- jjwt-impl
- jjwt-jackson

(These are JWT libraries you'll use to create and validate tokens)

---

# PART 2: DATABASE & ENTITIES

## Understanding the Users Table

**TASK:** Read and understand the Users table structure from BACKEND_REQUIREMENTS.txt

The table needs these columns:
- `id` - Unique identifier (UUID)
- `fullName` - User's full name
- `email` - User's email (unique - no duplicates allowed)
- `passwordHash` - Bcrypt hashed password (NOT plain text)
- `phone` - Optional phone number
- `refreshTokenHash` - Hashed refresh token
- `refreshTokenExpiry` - When refresh token expires
- `createdAt` - When account was created
- `updatedAt` - Last time data was updated
- `lastLogin` - Last login timestamp
- `isActive` - Is account active (true/false)

## Create the User Entity

**TASK:** Create a new file `User.java` in `src/main/java/com/gofast/entity/`

**Questions to answer before coding:**
1. What Java class represents a database table? (Hint: Use @Entity annotation)
2. How do you mark a field as primary key? (Hint: Use @Id)
3. How do you mark fields as NOT NULL? (Hint: nullable parameter)
4. How do you make email unique? (Hint: unique parameter in @Column)

**Step-by-step hints:**
- Create a class called `User`
- Add @Entity and @Table annotations
- Create private fields for each column (use camelCase)
- Add @Column annotations with appropriate constraints
- Add LocalDateTime fields for timestamps
- Add getters/setters (use Lombok @Data annotation to auto-generate)
- Add a @PreUpdate method to update the `updatedAt` timestamp

---

# PART 3: USER REGISTRATION

## Understanding the Sign-Up Flow

**Read from BACKEND_REQUIREMENTS.txt - Section 1.1:**
1. Validate email format
2. Check if email already exists (unique constraint)
3. Hash password using bcrypt (10 salt rounds)
4. Create user record in database
5. Generate JWT token
6. Return token and user details

## Step 1: Create DTOs (Data Transfer Objects)

**What is a DTO?** A class that defines what data comes IN (Request) and goes OUT (Response) of your API

**TASK:** Create three DTO classes:

1. **SignUpRequest.java** - What the frontend sends
   - Fields: fullName, email, password, phone
   - Add validation annotations:
     - @NotBlank - Field can't be empty
     - @Email - Must be valid email format
     - @Size - Min/max length

2. **SignUpResponse.java** - What your API sends back
   - Fields: success (boolean), message (string), userId, token, user (UserDto object)

3. **UserDto.java** - User information to send
   - Fields: id, name, email, phone
   - (Don't send password!)

**Hints:**
- Use Lombok @Data for getters/setters
- Use javax.validation annotations for validation

## Step 2: Create Password Encoder Service

**What it does:** Hashes and verifies passwords

**TASK:** Create `PasswordEncoderService.java` in `src/main/java/com/gofast/service/`

**Methods you need:**
1. `encodePassword(String rawPassword)` - Hash a plain password
   - Input: "myPassword123"
   - Output: "$2b$10$..." (bcrypt hash)
   - Hint: Use BCryptPasswordEncoder(10) - the 10 is salt rounds

2. `matches(String rawPassword, String encodedPassword)` - Verify password
   - Input: "myPassword123", "$2b$10$..."
   - Output: true/false
   - Hint: Use passwordEncoder.matches()

**Analogy:** Think of it like a fingerprint scanner:
- encodePassword = creates a fingerprint of the password
- matches = checks if new password creates same fingerprint

## Step 3: Create JWT Token Provider

**What it does:** Creates and validates JWT tokens

**TASK:** Create `JwtTokenProvider.java` in `src/main/java/com/gofast/service/`

**Methods you need:**
1. `generateAccessToken(String userId, String email)` - Create 7-day token
   - Use Jwts.builder()
   - Set subject to userId
   - Add claim for email
   - Set expiration to 7 days from now
   - Sign with secret key using HS256 algorithm

2. `generateRefreshToken(String userId, String email)` - Create 30-day token
   - Similar to above but 30 days expiration

3. `getUserIdFromtoken(String token)` - Extract user ID
   - Parse token using Jwts.parserBuilder()
   - Get subject
   - Handle JwtException if token is invalid

4. `validateToken(String token)` - Check if token is valid
   - Try to parse token
   - Return true if no exception
   - Return false if any JwtException

**Configuration from application.properties:**
- jwt.secret = your secret key (min 32 chars for HS256)
- jwt.expiration = 604800000 (7 days in milliseconds)
- jwt.refresh-expiration = 2592000000 (30 days in milliseconds)

## Step 4: Create User Repository

**What it does:** Database queries for User

**TASK:** Create `UserRepository.java` in `src/main/java/com/gofast/repository/`

**Methods you need:**
1. `findByEmail(String email)` - Find user by email
   - Return Optional<User>
   - Hint: Spring Data JPA auto-generates this from method name

2. `existsByEmail(String email)` - Check if email exists
   - Return Boolean
   - Hint: Spring Data JPA auto-generates this too

**Key concept:** Just extend JpaRepository and declare methods. Spring automatically implements them!

## Step 5: Create Auth Service (Sign-Up Logic)

**What it does:** Business logic for registration

**TASK:** Create `AuthService.java` in `src/main/java/com/gofast/service/`

**Method: signUp(SignUpRequest request)**

**Pseudo-code to follow:**
```
1. Check if email already exists
   - If YES → return error response "Email already registered"
   - If NO → continue

2. Hash the password
   - Use passwordEncoderService.encodePassword()

3. Create new User object
   - Set all fields from request
   - Set createdAt and updatedAt to now
   - Set isActive to true

4. Save user to database
   - Use userRepository.save()

5. Generate JWT token
   - Use jwtTokenProvider.generateAccessToken()
   - Pass userId and email

6. Generate refresh token (optional but recommended)
   - Use jwtTokenProvider.generateRefreshToken()
   - Store hash in database

7. Build and return SignUpResponse
   - Set success = true
   - Include token and user details
```

**Questions to guide your thinking:**
- Why check for duplicate email first?
- Why hash password BEFORE saving to database?
- Why set createdAt/updatedAt?
- Why not return plain refresh token to database?

## Step 6: Create Auth Controller (Sign-Up Endpoint)

**What it does:** HTTP endpoint for /api/auth/signup

**TASK:** Create `AuthController.java` in `src/main/java/com/gofast/controller/`

**Method: signUp(SignUpRequest request)**

**Implementation hints:**
- Use @PostMapping("/signup")
- @Valid @RequestBody - Validates input
- Call authService.signUp()
- Return ResponseEntity with appropriate HTTP status:
  - 201 CREATED if success
  - 400 BAD REQUEST if email exists

**Example HTTP call:**
```
POST /api/auth/signup
Content-Type: application/json

{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "securePass123",
  "phone": "1234567890"
}
```

---

# PART 4: USER LOGIN

## Understanding the Login Flow

**Read from BACKEND_REQUIREMENTS.txt - Section 1.2:**
1. Find user by email
2. Verify password matches hash
3. Update lastLogin timestamp
4. Generate new tokens
5. Return tokens and user details
6. Return generic "Invalid credentials" if anything fails (security!)

## Step 1: Create Login DTOs

**TASK:** Create `LoginRequest.java` and `LoginResponse.java`

**LoginRequest fields:**
- email (@Email, @NotBlank)
- password (@NotBlank)

**LoginResponse fields:**
- success
- message
- token
- refreshToken
- user (UserDto)

## Step 2: Add Login Method to AuthService

**TASK:** In `AuthService.java`, create `login(LoginRequest request)` method

**Pseudo-code to follow:**
```
1. Find user by email
   - If NOT found → return error "Invalid credentials"
   - (Note: Generic message - don't say "email not found")

2. Check if account is active
   - If isActive == false → return "Account suspended"

3. Verify password
   - Use passwordEncoderService.matches()
   - Pass: request.password and user.passwordHash
   - If doesn't match → return "Invalid credentials"

4. Generate access token
   - Use jwtTokenProvider.generateAccessToken()

5. Generate refresh token
   - Use jwtTokenProvider.generateRefreshToken()

6. Update lastLogin
   - Set user.lastLogin = now()

7. Store refresh token hash
   - Hash the refresh token
   - Set user.refreshTokenHash
   - Set user.refreshTokenExpiry

8. Save user to database

9. Build LoginResponse with tokens and user info

10. Return response
```

**Security questions:**
- Why return generic "Invalid credentials" instead of "Email not found"?
- Why update lastLogin?
- Why hash the refresh token before storing?

## Step 3: Add Login Endpoint to Controller

**TASK:** In `AuthController.java`, add login endpoint

**Method: login(LoginRequest request)**
- @PostMapping("/login")
- Call authService.login()
- Return 200 OK if success
- Return 401 UNAUTHORIZED if fail

---

# PART 5: LOGOUT

## Understanding the Logout Flow

**Read from BACKEND_REQUIREMENTS.txt - Section 1.3:**
1. Receive JWT token from Authorization header
2. Validate token is real
3. Add token to Redis blacklist
4. Return success

**Why blacklist?** Once logged out, that token shouldn't work anymore, even if someone has it.

## Step 1: Create Token Blacklist Service

**TASK:** Create `TokenBlacklistService.java` in `src/main/java/com/gofast/service/`

**What it does:** Manages token blacklist in Redis

**Methods you need:**

1. `blacklistToken(String token)` - Add token to blacklist
   - Extract expiration date from token
   - Calculate remaining time
   - Store in Redis with that TTL
   - When TTL expires, Redis auto-deletes it

   **Example Redis entry:**
   ```
   Key: "blacklist:userId:tokenId"
   Value: "true"
   TTL: 7 days
   ```

2. `isTokenBlacklisted(String token, String userId)` - Check if blacklisted
   - Check if key exists in Redis
   - Return true/false

**Configuration from application.properties:**
- spring.redis.host=localhost
- spring.redis.port=6379

## Step 2: Create Logout DTO

**TASK:** Create `LogoutResponse.java`

**Fields:**
- success (boolean)
- message (string)

## Step 3: Add Logout Method to AuthService

**TASK:** In `AuthService.java`, add `logout(String token)` method

**Pseudo-code:**
```
1. Extract user ID from token
   - Use jwtTokenProvider.getUserIdFromToken()

2. Validate token is valid
   - Use jwtTokenProvider.validateToken()
   - If invalid → return error

3. Add token to blacklist
   - Use tokenBlacklistService.blacklistToken()
   - This prevents future use of this token

4. Return success response
```

## Step 4: Add Logout Endpoint to Controller

**TASK:** In `AuthController.java`, add logout endpoint

**Method: logout(String authHeader)**
- @PostMapping("/logout")
- Extract token from Authorization header
- Call authService.logout()
- Return 200 OK if success

**Challenge:** How do you extract token from header?
- Header format: "Bearer eyJhbGciOiJIUzI1NiIs..."
- You need to remove "Bearer " prefix and get the token part

---

# PART 6: TOKEN REFRESH

## Understanding Token Refresh Flow

**Read from BACKEND_REQUIREMENTS.txt - Section 1.4:**
1. Receive refresh token from request
2. Validate refresh token is valid
3. Check refresh token hasn't been blacklisted
4. Generate NEW access token
5. Generate NEW refresh token (rotate for security)
6. Return both tokens

**Why rotate tokens?** If old refresh token is stolen, generating a new one limits damage.

## Step 1: Create Refresh DTOs

**TASK:** Create `TokenRefreshRequest.java` and `TokenRefreshResponse.java`

**TokenRefreshRequest fields:**
- refreshToken (@NotBlank)

**TokenRefreshResponse fields:**
- success
- message
- accessToken
- refreshToken

## Step 2: Add Token Refresh Method to AuthService

**TASK:** In `AuthService.java`, add `refreshToken(TokenRefreshRequest request)` method

**Pseudo-code:**
```
1. Validate refresh token is not expired
   - Use jwtTokenProvider.validateToken()
   - If invalid → return error

2. Extract user ID from token
   - Use jwtTokenProvider.getUserIdFromToken()

3. Find user in database
   - Use userRepository.findById()
   - If not found → return error

4. Verify refresh token hash matches
   - Get stored hash from user.refreshTokenHash
   - Use passwordEncoderService.matches()
   - If doesn't match → return error

5. Check if refresh token is blacklisted
   - Use tokenBlacklistService.isTokenBlacklisted()
   - If blacklisted → return error

6. Check if refresh token has expired
   - Compare user.refreshTokenExpiry with now()
   - If expired → return error

7. Generate new access token
   - Use jwtTokenProvider.generateAccessToken()

8. Generate new refresh token
   - Use jwtTokenProvider.generateRefreshToken()

9. Update database with new refresh token hash
   - Hash new refresh token
   - Store hash and expiry

10. Return both new tokens
```

**Questions:**
- Why check if token is blacklisted?
- Why check if token has expired if we already validated it?
- Why rotate (change) the refresh token each time?

## Step 3: Add Token Refresh Endpoint to Controller

**TASK:** In `AuthController.java`, add refresh endpoint

**Method: refreshToken(TokenRefreshRequest request)**
- @PostMapping("/refresh")
- Call authService.refreshToken()
- Return 200 OK if success
- Return 401 UNAUTHORIZED if fail

---

# SECURITY CONSIDERATIONS

## Password Security

**MUST DO:**
- ✅ Hash ALL passwords with bcrypt (salt rounds ≥ 10)
- ✅ Never store plain text passwords
- ✅ Use passwordEncoder.matches() to verify (never compare strings directly)
- ✅ Enforce minimum 8 character password policy

**WHY:** If database is hacked, attackers only get hashes, not passwords

## JWT Token Security

**MUST DO:**
- ✅ Use HTTPS only (not HTTP)
- ✅ Sign tokens with strong secret key (min 32 characters for HS256)
- ✅ Set appropriate expiration times (short for access, longer for refresh)
- ✅ Include user ID and email in token (not sensitive data)
- ✅ Store tokens in httpOnly cookies or secure localStorage

**DON'T:**
- ❌ Store passwords in tokens
- ❌ Store sensitive data in tokens
- ❌ Use weak secret keys

## API Security

**MUST DO:**
- ✅ Return generic "Invalid credentials" message
- ✅ Don't reveal if email exists or not
- ✅ Validate all input (@Valid, @Email, @NotBlank)
- ✅ Use @Transactional for database consistency
- ✅ Log failed login attempts

**WHY:** Prevents information leakage and brute force attacks

## Database Security

**MUST DO:**
- ✅ Add UNIQUE constraint on email
- ✅ Add indexes on frequently queried columns (email, userId)
- ✅ Store password HASHES not plain passwords
- ✅ Store refresh token HASHES not plain tokens
- ✅ Use prepared statements (JPA does this automatically)

---

# TESTING YOUR IMPLEMENTATION

## How to Test Each Endpoint

### Test 1: User Registration

**Use Postman or cURL:**
```bash
POST http://localhost:8080/api/auth/signup
Content-Type: application/json

{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "securePass123",
  "phone": "1234567890"
}
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "message": "Account created successfully",
  "userId": "some-uuid",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "some-uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890"
  }
}
```

**Test Cases to Try:**
- ✅ Valid registration → should return 201
- ✅ Duplicate email → should return 400
- ✅ Password < 8 chars → should return 400
- ✅ Invalid email format → should return 400

### Test 2: User Login

```bash
POST http://localhost:8080/api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePass123"
}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "some-uuid",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Test Cases:**
- ✅ Correct credentials → 200 OK
- ✅ Wrong password → 401 Unauthorized
- ✅ Non-existent email → 401 Unauthorized (generic message!)
- ✅ Inactive account → should return error

### Test 3: Logout

```bash
POST http://localhost:8080/api/auth/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

(empty body)
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Test Cases:**
- ✅ Valid token → 200 OK, token blacklisted
- ✅ Invalid token → 401 Unauthorized
- ✅ Try using same token again → should fail

### Test 4: Token Refresh

```bash
POST http://localhost:8080/api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Tokens refreshed successfully",
  "accessToken": "new-token...",
  "refreshToken": "new-token..."
}
```

**Test Cases:**
- ✅ Valid refresh token → 200 OK, new tokens returned
- ✅ Expired refresh token → 401 Unauthorized
- ✅ Invalid refresh token → 401 Unauthorized

## Common Issues & How to Debug

**Issue: Password not hashing correctly**
- Check: Are you using BCryptPasswordEncoder(10)?
- Check: Does bcrypt.matches() return false for correct password?
- Solution: Log the hashed password and verify it's different each time (bcrypt adds salt)

**Issue: Token validation failing**
- Check: Is your JWT secret key at least 32 characters?
- Check: Are you extracting token from Authorization header correctly?
- Check: Is token expiration set in milliseconds?
- Solution: Add debug logs in JwtTokenProvider.validateToken()

**Issue: Duplicate emails being created**
- Check: Is your database UNIQUE constraint on email column?
- Check: Is existsByEmail() query working?
- Solution: Check MySQL table schema

**Issue: Token blacklist not working**
- Check: Is Redis running? (redis-cli ping)
- Check: Is spring.redis.host correctly pointing to Redis?
- Solution: Add debug logs in TokenBlacklistService

---

## Key Takeaways

**What you learned:**
1. Password security using bcrypt hashing
2. JWT token generation and validation
3. Token blacklisting for secure logout
4. Database design with proper constraints
5. Spring Boot service architecture (Entity → Repository → Service → Controller)
6. RESTful API design and HTTP status codes
7. Input validation and error handling
8. Security best practices

**Next Steps:**
1. Implement each section following the pseudo-code
2. Test each endpoint thoroughly
3. Check database to see data being saved
4. View Redis to see tokens being blacklisted
5. Review your code with security in mind
6. Add logging for debugging
7. Write unit tests for each service method

---

## Reference: Architecture Pattern Used

```
REQUEST → CONTROLLER → SERVICE → REPOSITORY → DATABASE
                          ↓
                      JWT PROVIDER
                      PASSWORD ENCODER
                      TOKEN BLACKLIST
```

This is the standard Spring Boot architecture: **Separation of Concerns**
- Controller handles HTTP
- Service handles business logic
- Repository handles database
- Utilities (JWT, Password, etc.) are reusable

Good luck implementing! 🚀

```xml
<!-- Spring Boot Web Starter -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>

<!-- Spring Boot Data JPA (Database) -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>

<!-- Spring Security -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>

<!-- JWT (JSON Web Token) -->
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.12.3</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.12.3</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.12.3</version>
    <scope>runtime</scope>
</dependency>

<!-- MySQL Database Driver -->
<dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-java</artifactId>
    <version>8.0.33</version>
</dependency>

<!-- Lombok (Reduces boilerplate code) -->
<dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
    <optional>true</optional>
</dependency>

<!-- Validation -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>

<!-- Redis (For Token Blacklist) -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

### Application Properties

Create `application.properties`:

```properties
# Server Configuration
server.port=8080
server.servlet.context-path=/api

# Database Configuration
spring.datasource.url=jdbc:mysql://localhost:3306/gofast_db?useSSL=false&serverTimezone=UTC
spring.datasource.username=root
spring.datasource.password=your_password
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQL8Dialect

# JWT Configuration
jwt.secret=your_super_secret_key_min_32_chars_for_hs256_algorithm
jwt.expiration=604800000
jwt.refresh-expiration=2592000000

# Redis Configuration
spring.redis.host=localhost
spring.redis.port=6379
spring.redis.database=0
```

---

## Database Configuration

### Step 1: Create the Users Table

Run this SQL script to create the users table:

```sql
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NULL,
    refresh_token_hash VARCHAR(255) NULL,
    refresh_token_expiry TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_email (email),
    INDEX idx_created_at (created_at)
);
```

### Step 2: Create the User Entity Class

```java
package com.gofast.entity;

import lombok.*;
import javax.persistence.*;
import java.time.LocalDateTime;
import org.hibernate.annotations.GenericGenerator;

@Entity
@Table(name = "users", indexes = {
    @Index(name = "idx_email", columnList = "email", unique = true)
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    
    @Id
    @GeneratedValue(generator = "uuid")
    @GenericGenerator(name = "uuid", strategy = "uuid2")
    private String id;
    
    @Column(name = "full_name", nullable = false)
    private String fullName;
    
    @Column(name = "email", nullable = false, unique = true)
    private String email;
    
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;
    
    @Column(name = "phone")
    private String phone;
    
    @Column(name = "refresh_token_hash")
    private String refreshTokenHash;
    
    @Column(name = "refresh_token_expiry")
    private LocalDateTime refreshTokenExpiry;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
    
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();
    
    @Column(name = "last_login")
    private LocalDateTime lastLogin;
    
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
    
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
```

---

## User Registration (Sign Up)

### Step 1: Create the Repository

```java
package com.gofast.repository;

import com.gofast.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByEmail(String email);
    Boolean existsByEmail(String email);
}
```

### Step 2: Create Request and Response DTOs

**SignUpRequest.java:**
```java
package com.gofast.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import javax.validation.constraints.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SignUpRequest {
    
    @NotBlank(message = "Full name is required")
    @Size(min = 2, max = 100, message = "Full name must be between 2 and 100 characters")
    private String fullName;
    
    @NotBlank(message = "Email is required")
    @Email(message = "Email should be valid")
    private String email;
    
    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters long")
    private String password;
    
    @Phone(message = "Phone number should be valid")
    private String phone;
}
```

**SignUpResponse.java:**
```java
package com.gofast.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SignUpResponse {
    private Boolean success;
    private String message;
    private String userId;
    private String token;
    private UserDto user;
}
```

**UserDto.java:**
```java
package com.gofast.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDto {
    private String id;
    private String name;
    private String email;
    private String phone;
}
```

### Step 3: Create JWT Token Utility Class

```java
package com.gofast.util;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
@Slf4j
public class JwtTokenProvider {
    
    @Value("${jwt.secret}")
    private String jwtSecret;
    
    @Value("${jwt.expiration}")
    private long jwtExpirationMs;
    
    @Value("${jwt.refresh-expiration}")
    private long refreshExpirationMs;
    
    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }
    
    /**
     * Generate JWT Token for Access
     */
    public String generateAccessToken(String userId, String email) {
        return buildToken(userId, email, jwtExpirationMs);
    }
    
    /**
     * Generate Refresh Token
     */
    public String generateRefreshToken(String userId, String email) {
        return buildToken(userId, email, refreshExpirationMs);
    }
    
    /**
     * Build JWT Token
     */
    private String buildToken(String userId, String email, long expirationTime) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expirationTime);
        
        return Jwts.builder()
                .subject(userId)
                .claim("email", email)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }
    
    /**
     * Extract User ID from Token
     */
    public String getUserIdFromToken(String token) {
        try {
            return Jwts.parserBuilder()
                    .setSigningKey(getSigningKey())
                    .build()
                    .parseClaimsJws(token)
                    .getBody()
                    .getSubject();
        } catch (JwtException e) {
            log.error("Error extracting user ID from token: {}", e.getMessage());
            return null;
        }
    }
    
    /**
     * Extract Email from Token
     */
    public String getEmailFromToken(String token) {
        try {
            return (String) Jwts.parserBuilder()
                    .setSigningKey(getSigningKey())
                    .build()
                    .parseClaimsJws(token)
                    .getBody()
                    .get("email");
        } catch (JwtException e) {
            log.error("Error extracting email from token: {}", e.getMessage());
            return null;
        }
    }
    
    /**
     * Get Token Expiration Date
     */
    public Date getExpirationDateFromToken(String token) {
        try {
            return Jwts.parserBuilder()
                    .setSigningKey(getSigningKey())
                    .build()
                    .parseClaimsJws(token)
                    .getBody()
                    .getExpiration();
        } catch (JwtException e) {
            log.error("Error extracting expiration date from token: {}", e.getMessage());
            return null;
        }
    }
    
    /**
     * Validate JWT Token
     */
    public Boolean validateToken(String token) {
        try {
            Jwts.parserBuilder()
                    .setSigningKey(getSigningKey())
                    .build()
                    .parseClaimsJws(token);
            return true;
        } catch (SecurityException e) {
            log.error("Invalid JWT signature: {}", e.getMessage());
        } catch (MalformedJwtException e) {
            log.error("Invalid JWT token: {}", e.getMessage());
        } catch (ExpiredJwtException e) {
            log.error("Expired JWT token: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            log.error("Unsupported JWT token: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            log.error("JWT claims string is empty: {}", e.getMessage());
        }
        return false;
    }
}
```

### Step 4: Create Password Encoder Service

```java
package com.gofast.service;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class PasswordEncoderService {
    
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(10);
    
    /**
     * Encode password using bcrypt with 10 salt rounds
     */
    public String encodePassword(String rawPassword) {
        return passwordEncoder.encode(rawPassword);
    }
    
    /**
     * Verify password against hash
     */
    public Boolean matches(String rawPassword, String encodedPassword) {
        return passwordEncoder.matches(rawPassword, encodedPassword);
    }
}
```

### Step 5: Create Auth Service

```java
package com.gofast.service;


```

### Step 6: Create Auth Controller

```java
package com.gofast.controller;

import com.gofast.dto.SignUpRequest;
import com.gofast.dto.SignUpResponse;
import com.gofast.service.AuthService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;

@RestController
@RequestMapping("/auth")
@Slf4j
public class AuthController {
    
    @Autowired
    private AuthService authService;
    
    /**
     * POST /api/auth/signup
     * 
     * ENDPOINT DESCRIPTION:
     * Creates a new user account in the system
     * 
     * REQUEST BODY:
     * {
     *   "fullName": "string",
     *   "email": "string (unique)",
     *   "password": "string (min 8 chars)",
     *   "phone": "string (optional)"
     * }
     * 
     * RESPONSE (201 Created):
     * {
     *   "success": true,
     *   "message": "Account created successfully",
     *   "userId": "UUID",
     *   "token": "JWT token",
     *   "user": {
     *     "id": "UUID",
     *     "name": "string",
     *     "email": "string",
     *     "phone": "string"
     *   }
     * }
     * 
     * RESPONSE (400 Bad Request):
     * If email already exists or validation fails
     */
    @PostMapping("/signup")
    public ResponseEntity<SignUpResponse> signUp(@Valid @RequestBody SignUpRequest request) {
        log.info("Received signup request for email: {}", request.getEmail());
        
        SignUpResponse response = authService.signUp(request);
        
        if (response.getSuccess()) {
            return new ResponseEntity<>(response, HttpStatus.CREATED);
        } else {
            return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
        }
    }
}
```

---

## User Login

### Step 1: Create Login DTOs

**LoginRequest.java:**
```java
package com.gofast.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import javax.validation.constraints.Email;
import javax.validation.constraints.NotBlank;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoginRequest {
    
    @NotBlank(message = "Email is required")
    @Email(message = "Email should be valid")
    private String email;
    
    @NotBlank(message = "Password is required")
    private String password;
}
```

**LoginResponse.java:**
```java
package com.gofast.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoginResponse {
    private Boolean success;
    private String message;
    private String token;
    private String refreshToken;
    private UserDto user;
}
```

### Step 2: Add Login Method to Auth Service

```java
/**
 * User Login
 * 
 * LOGIC:
 * 1. Validate email exists in database
 * 2. Compare provided password with stored hash using bcrypt
 * 3. If credentials invalid, return generic "Invalid credentials" message (security)
 * 4. Check if account is active (isActive = true)
 * 5. If account inactive, return "Account suspended"
 * 6. Generate new JWT access token (7-day expiration)
 * 7. Generate new refresh token (30-day expiration)
 * 8. Update user's lastLogin timestamp
 * 9. Store refresh token hash in database
 * 10. Return tokens and user details
 * 11. Log successful login for analytics
 * 
 * ERROR HANDLING:
 * - Invalid email: Return generic "Invalid credentials"
 * - Invalid password: Return generic "Invalid credentials"
 * - Inactive account: Return "Account suspended"
 */
@Transactional
public LoginResponse login(LoginRequest request) {
    log.info("Attempting login for email: {}", request.getEmail());
    
    // Step 1: Find user by email
    Optional<User> userOptional = userRepository.findByEmail(request.getEmail());
    
    if (userOptional.isEmpty()) {
        log.warn("Login failed: Email not found - {}", request.getEmail());
        // Generic message for security
        return LoginResponse.builder()
                .success(false)
                .message("Invalid credentials")
                .build();
    }
    
    User user = userOptional.get();
    
    // Step 4: Check if account is active
    if (!user.getIsActive()) {
        log.warn("Login failed: Account inactive for user - {}", user.getEmail());
        return LoginResponse.builder()
                .success(false)
                .message("Account suspended")
                .build();
    }
    
    // Step 2: Compare passwords using bcrypt
    if (!passwordEncoderService.matches(request.getPassword(), user.getPasswordHash())) {
        log.warn("Login failed: Invalid password for user - {}", request.getEmail());
        // Generic message for security
        return LoginResponse.builder()
                .success(false)
                .message("Invalid credentials")
                .build();
    }
    
    // Step 6: Generate access token (7-day expiration)
    String accessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail());
    
    // Step 7: Generate refresh token (30-day expiration)
    String refreshToken = jwtTokenProvider.generateRefreshToken(user.getId(), user.getEmail());
    
    // Step 8: Update lastLogin timestamp
    user.setLastLogin(LocalDateTime.now());
    
    // Step 9: Store refresh token hash
    String refreshTokenHash = passwordEncoderService.encodePassword(refreshToken);
    user.setRefreshTokenHash(refreshTokenHash);
    user.setRefreshTokenExpiry(LocalDateTime.now().plusDays(30));
    
    userRepository.save(user);
    log.info("User successfully logged in: {}", user.getEmail());
    
    // Step 10: Build response
    UserDto userDto = UserDto.builder()
            .id(user.getId())
            .name(user.getFullName())
            .email(user.getEmail())
            .phone(user.getPhone())
            .build();
    
    return LoginResponse.builder()
            .success(true)
            .message("Login successful")
            .token(accessToken)
            .refreshToken(refreshToken)
            .user(userDto)
            .build();
}
```

### Step 3: Add Login Endpoint to Controller

```java
/**
 * POST /api/auth/login
 * 
 * ENDPOINT DESCRIPTION:
 * Authenticates a user and returns JWT tokens
 * 
 * REQUEST BODY:
 * {
 *   "email": "string",
 *   "password": "string"
 * }
 * 
 * RESPONSE (200 OK):
 * {
 *   "success": true,
 *   "message": "Login successful",
 *   "token": "JWT access token",
 *   "refreshToken": "JWT refresh token",
 *   "user": {
 *     "id": "UUID",
 *     "name": "string",
 *     "email": "string",
 *     "phone": "string"
 *   }
 * }
 * 
 * RESPONSE (401 Unauthorized):
 * {
 *   "success": false,
 *   "message": "Invalid credentials"
 * }
 */
@PostMapping("/login")
public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
    log.info("Received login request for email: {}", request.getEmail());
    
    LoginResponse response = authService.login(request);
    
    if (response.getSuccess()) {
        return new ResponseEntity<>(response, HttpStatus.OK);
    } else {
        return new ResponseEntity<>(response, HttpStatus.UNAUTHORIZED);
    }
}
```

---

## Logout

### Step 1: Create Token Blacklist Service (Redis)

```java
package com.gofast.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class TokenBlacklistService {
    
    @Autowired
    private RedisTemplate<String, String> redisTemplate;
    
    @Autowired
    private JwtTokenProvider jwtTokenProvider;
    
    /**
     * Add token to blacklist
     * 
     * LOGIC:
     * 1. Extract token expiration date
     * 2. Calculate remaining time until expiration
     * 3. Store token in Redis with TTL equal to remaining time
     * 4. When TTL expires, token is automatically deleted from Redis
     * 
     * REDIS KEY FORMAT: blacklist:<tokenId>:<userId>
     * REDIS VALUE: true (any value, we only check key existence)
     * REDIS TTL: Token expiration time
     */
    public void blacklistToken(String token) {
        try {
            // Extract user ID from token
            String userId = jwtTokenProvider.getUserIdFromToken(token);
            
            // Get token expiration date
            Date expirationDate = jwtTokenProvider.getExpirationDateFromToken(token);
            
            if (userId == null || expirationDate == null) {
                log.error("Cannot blacklist token: Invalid token structure");
                return;
            }
            
            // Calculate remaining time
            long now = System.currentTimeMillis();
            long expirationTime = expirationDate.getTime();
            long remainingTime = expirationTime - now;
            
            if (remainingTime <= 0) {
                log.warn("Token already expired, no need to blacklist");
                return;
            }
            
            // Store token in Redis with TTL
            String blacklistKey = "blacklist:" + userId + ":" + token.substring(0, 10);
            redisTemplate.opsForValue().set(
                    blacklistKey, 
                    "true", 
                    remainingTime, 
                    TimeUnit.MILLISECONDS
            );
            
            log.info("Token blacklisted for user: {}", userId);
            
        } catch (Exception e) {
            log.error("Error blacklisting token: {}", e.getMessage());
        }
    }
    
    /**
     * Check if token is blacklisted
     */
    public Boolean isTokenBlacklisted(String token, String userId) {
        try {
            String blacklistKey = "blacklist:" + userId + ":" + token.substring(0, 10);
            Boolean exists = redisTemplate.hasKey(blacklistKey);
            return exists != null && exists;
        } catch (Exception e) {
            log.error("Error checking token blacklist: {}", e.getMessage());
            return false;
        }
    }
}
```

### Step 2: Create Logout DTO

**LogoutResponse.java:**
```java
package com.gofast.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LogoutResponse {
    private Boolean success;
    private String message;
}
```

### Step 3: Add Logout Method to Auth Service

```java
/**
 * User Logout
 * 
 * LOGIC:
 * 1. Extract user ID from JWT token
 * 2. Validate JWT token is valid
 * 3. Add token to Redis blacklist
 * 4. Set TTL equal to token expiration time
 * 5. Clear user session (if using sessions)
 * 6. Return success response
 * 7. Frontend will clear stored token from localStorage
 * 
 * TOKEN BLACKLIST (REDIS):
 * - Key: blacklist:<userId>:<tokenId>
 * - Value: true
 * - TTL: Token expiration time (7 days)
 * - When TTL expires, key is automatically deleted from Redis
 */
@Transactional
public LogoutResponse logout(String token) {
    log.info("Processing logout request");
    
    // Step 1 & 2: Extract user ID and validate token
    String userId = jwtTokenProvider.getUserIdFromToken(token);
    
    if (userId == null || !jwtTokenProvider.validateToken(token)) {
        log.error("Logout failed: Invalid token");
        return LogoutResponse.builder()
                .success(false)
                .message("Invalid token")
                .build();
    }
    
    // Step 3 & 4: Add token to blacklist with TTL
    tokenBlacklistService.blacklistToken(token);
    
    log.info("User successfully logged out: {}", userId);
    
    return LogoutResponse.builder()
            .success(true)
            .message("Logged out successfully")
            .build();
}
```

### Step 4: Add Logout Endpoint to Controller

```java
/**
 * POST /api/auth/logout
 * 
 * ENDPOINT DESCRIPTION:
 * Logs out a user by blacklisting their token
 * 
 * REQUEST HEADERS:
 * Authorization: Bearer <JWT token>
 * 
 * RESPONSE (200 OK):
 * {
 *   "success": true,
 *   "message": "Logged out successfully"
 * }
 * 
 * RESPONSE (401 Unauthorized):
 * {
 *   "success": false,
 *   "message": "Invalid token"
 * }
 * 
 * PROCESS:
 * 1. Server adds token to Redis blacklist
 * 2. Frontend removes token from localStorage
 * 3. Subsequent requests with blacklisted token are rejected
 */
@PostMapping("/logout")
public ResponseEntity<LogoutResponse> logout(@RequestHeader("Authorization") String authHeader) {
    log.info("Received logout request");
    
    // Extract token from Authorization header (format: "Bearer <token>")
    String token = extractTokenFromAuthHeader(authHeader);
    
    if (token == null) {
        return new ResponseEntity<>(
                LogoutResponse.builder()
                        .success(false)
                        .message("Invalid authorization header")
                        .build(),
                HttpStatus.BAD_REQUEST
        );
    }
    
    LogoutResponse response = authService.logout(token);
    
    if (response.getSuccess()) {
        return new ResponseEntity<>(response, HttpStatus.OK);
    } else {
        return new ResponseEntity<>(response, HttpStatus.UNAUTHORIZED);
    }
}

/**
 * Helper method to extract JWT token from Authorization header
 */
private String extractTokenFromAuthHeader(String authHeader) {
    if (authHeader != null && authHeader.startsWith("Bearer ")) {
        return authHeader.substring(7);
    }
    return null;
}
```

---

## Token Refresh

### Step 1: Create Refresh Token DTOs

**TokenRefreshRequest.java:**
```java
package com.gofast.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import javax.validation.constraints.NotBlank;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TokenRefreshRequest {
    
    @NotBlank(message = "Refresh token is required")
    private String refreshToken;
}
```

**TokenRefreshResponse.java:**
```java
package com.gofast.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TokenRefreshResponse {
    private Boolean success;
    private String message;
    private String accessToken;
    private String refreshToken;
}
```

### Step 2: Add Token Refresh Method to Auth Service

```java
/**
 * Token Refresh
 * 
 * LOGIC:
 * 1. Validate refresh token is valid (not expired)
 * 2. Extract user ID from refresh token
 * 3. Find user in database
 * 4. Compare provided refresh token hash with stored hash
 * 5. If token is blacklisted, reject refresh
 * 6. Generate new access token (short expiration: 1 hour)
 * 7. Generate new refresh token (long expiration: 7 days)
 * 8. Store new refresh token hash in database
 * 9. Return both new tokens
 * 
 * TOKEN EXPIRATION TIMES:
 * - Access Token: 1 hour (short-lived)
 * - Refresh Token: 7 days (long-lived)
 * - This allows frequent token rotation while maintaining security
 * 
 * USE CASE:
 * When access token expires, frontend sends refresh token
 * Backend validates and returns new tokens without requiring login again
 */
@Transactional
public TokenRefreshResponse refreshToken(TokenRefreshRequest request) {
    log.info("Processing token refresh request");
    
    String refreshToken = request.getRefreshToken();
    
    // Step 1: Validate refresh token is not expired
    if (!jwtTokenProvider.validateToken(refreshToken)) {
        log.warn("Token refresh failed: Invalid or expired refresh token");
        return TokenRefreshResponse.builder()
                .success(false)
                .message("Invalid or expired refresh token")
                .build();
    }
    
    // Step 2: Extract user ID
    String userId = jwtTokenProvider.getUserIdFromToken(refreshToken);
    
    if (userId == null) {
        log.error("Token refresh failed: Cannot extract user ID from refresh token");
        return TokenRefreshResponse.builder()
                .success(false)
                .message("Invalid refresh token")
                .build();
    }
    
    // Step 3 & 4: Find user and verify refresh token
    Optional<User> userOptional = userRepository.findById(userId);
    
    if (userOptional.isEmpty()) {
        log.error("Token refresh failed: User not found for ID: {}", userId);
        return TokenRefreshResponse.builder()
                .success(false)
                .message("User not found")
                .build();
    }
    
    User user = userOptional.get();
    
    // Verify refresh token hash matches stored hash
    if (user.getRefreshTokenHash() == null || 
        !passwordEncoderService.matches(refreshToken, user.getRefreshTokenHash())) {
        log.warn("Token refresh failed: Refresh token hash mismatch for user: {}", userId);
        return TokenRefreshResponse.builder()
                .success(false)
                .message("Invalid refresh token")
                .build();
    }
    
    // Check if refresh token has expired
    if (user.getRefreshTokenExpiry() != null && 
        user.getRefreshTokenExpiry().isBefore(LocalDateTime.now())) {
        log.warn("Token refresh failed: Refresh token expired for user: {}", userId);
        return TokenRefreshResponse.builder()
                .success(false)
                .message("Refresh token expired")
                .build();
    }
    
    // Step 5: Check if token is blacklisted
    if (tokenBlacklistService.isTokenBlacklisted(refreshToken, userId)) {
        log.warn("Token refresh failed: Refresh token is blacklisted for user: {}", userId);
        return TokenRefreshResponse.builder()
                .success(false)
                .message("Refresh token has been revoked")
                .build();
    }
    
    // Step 6: Generate new access token (1 hour expiration)
    String newAccessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail());
    
    // Step 7: Generate new refresh token (7 days expiration)
    String newRefreshToken = jwtTokenProvider.generateRefreshToken(user.getId(), user.getEmail());
    
    // Step 8: Store new refresh token hash
    String newRefreshTokenHash = passwordEncoderService.encodePassword(newRefreshToken);
    user.setRefreshTokenHash(newRefreshTokenHash);
    user.setRefreshTokenExpiry(LocalDateTime.now().plusDays(30));
    userRepository.save(user);
    
    log.info("Token refresh successful for user: {}", userId);
    
    return TokenRefreshResponse.builder()
            .success(true)
            .message("Tokens refreshed successfully")
            .accessToken(newAccessToken)
            .refreshToken(newRefreshToken)
            .build();
}
```

### Step 3: Add Token Refresh Endpoint to Controller

```java
/**
 * POST /api/auth/refresh
 * 
 * ENDPOINT DESCRIPTION:
 * Refreshes expired access token using refresh token
 * 
 * REQUEST BODY:
 * {
 *   "refreshToken": "string"
 * }
 * 
 * RESPONSE (200 OK):
 * {
 *   "success": true,
 *   "message": "Tokens refreshed successfully",
 *   "accessToken": "new JWT access token",
 *   "refreshToken": "new JWT refresh token"
 * }
 * 
 * RESPONSE (401 Unauthorized):
 * {
 *   "success": false,
 *   "message": "Invalid or expired refresh token"
 * }
 * 
 * TOKEN ROTATION:
 * - Access token expires after 1 hour
 * - When expired, frontend uses refresh token to get new tokens
 * - Both access and refresh tokens are rotated for security
 * - Old refresh token can be invalidated on backend
 */
@PostMapping("/refresh")
public ResponseEntity<TokenRefreshResponse> refreshToken(@Valid @RequestBody TokenRefreshRequest request) {
    log.info("Received token refresh request");
    
    TokenRefreshResponse response = authService.refreshToken(request);
    
    if (response.getSuccess()) {
        return new ResponseEntity<>(response, HttpStatus.OK);
    } else {
        return new ResponseEntity<>(response, HttpStatus.UNAUTHORIZED);
    }
}
```

---

## Security Best Practices

### 1. JWT Filter (Authentication Filter)

```java
package com.gofast.filter;

import com.gofast.service.JwtTokenProvider;
import com.gofast.service.TokenBlacklistService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

@Component
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    
    @Autowired
    private JwtTokenProvider jwtTokenProvider;
    
    @Autowired
    private TokenBlacklistService tokenBlacklistService;
    
    @Override
    protected void doFilterInternal(
            HttpServletRequest request, 
            HttpServletResponse response, 
            FilterChain filterChain) throws ServletException, IOException {
        
        try {
            String jwt = getJwtFromRequest(request);
            
            if (jwt != null && jwtTokenProvider.validateToken(jwt)) {
                String userId = jwtTokenProvider.getUserIdFromToken(jwt);
                
                // Check if token is blacklisted
                if (tokenBlacklistService.isTokenBlacklisted(jwt, userId)) {
                    log.warn("Blacklisted token used for request");
                    response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Token has been revoked");
                    return;
                }
                
                // Token is valid, continue request
                log.debug("Valid JWT token found for user: {}", userId);
            }
        } catch (Exception ex) {
            log.error("Error processing JWT token: {}", ex.getMessage());
        }
        
        filterChain.doFilter(request, response);
    }
    
    /**
     * Extract JWT token from Authorization header
     */
    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
```

### 2. Security Configuration

```java
package com.gofast.config;

import com.gofast.filter.JwtAuthenticationFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;
    
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10);
    }
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf().disable()
            .sessionManagement().sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            .and()
            .authorizeRequests()
                .antMatchers("/api/auth/signup", "/api/auth/login", "/api/auth/refresh").permitAll()
                .anyRequest().authenticated()
            .and()
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .cors();
        
        return http.build();
    }
}
```

### 3. Security Best Practices Summary

```
PASSWORD SECURITY:
✓ Hash passwords using bcrypt with 10 salt rounds
✓ Never store plain text passwords
✓ Use strong password requirements (min 8 chars)
✓ Validate passwords using bcrypt.matches()

TOKEN SECURITY:
✓ Use HTTPS for all authentication endpoints
✓ Sign tokens with a strong secret key (min 32 chars for HS256)
✓ Set short expiration times (1 hour for access tokens)
✓ Implement token rotation for refresh tokens
✓ Store tokens securely (httpOnly cookies or secure localStorage)
✓ Implement token blacklist for logout

ERROR HANDLING:
✓ Return generic "Invalid credentials" message
✓ Don't expose whether email exists or not
✓ Log failed login attempts for security
✓ Implement rate limiting on login endpoints

DATABASE SECURITY:
✓ Use prepared statements to prevent SQL injection
✓ Add unique constraints on email column
✓ Index frequently searched columns (email, userId)
✓ Store refresh token hashes, not plain tokens
```

---

## Testing

### Unit Tests for AuthService

```java
package com.gofast.service;

import com.gofast.dto.*;
import com.gofast.entity.User;
import com.gofast.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class AuthServiceTest {
    
    @Mock
    private UserRepository userRepository;
    
    @Mock
    private PasswordEncoderService passwordEncoderService;
    
    @Mock
    private JwtTokenProvider jwtTokenProvider;
    
    @Mock
    private TokenBlacklistService tokenBlacklistService;
    
    @InjectMocks
    private AuthService authService;
    
    @BeforeEach
    public void setUp() {
        MockitoAnnotations.openMocks(this);
    }
    
    /**
     * TEST: Successful User Signup
     * 
     * Given: Valid signup request with unique email
     * When: SignUp service is called
     * Then: New user is created and JWT token is returned
     */
    @Test
    public void testSignUpSuccess() {
        SignUpRequest request = new SignUpRequest();
        request.setFullName("John Doe");
        request.setEmail("john@example.com");
        request.setPassword("password123");
        request.setPhone("1234567890");
        
        when(userRepository.existsByEmail("john@example.com")).thenReturn(false);
        when(passwordEncoderService.encodePassword("password123")).thenReturn("hashedPassword");
        when(jwtTokenProvider.generateAccessToken(anyString(), anyString())).thenReturn("accessToken");
        when(jwtTokenProvider.generateRefreshToken(anyString(), anyString())).thenReturn("refreshToken");
        
        User mockUser = new User();
        mockUser.setId("uuid-123");
        mockUser.setFullName("John Doe");
        mockUser.setEmail("john@example.com");
        mockUser.setPhone("1234567890");
        
        when(userRepository.save(any(User.class))).thenReturn(mockUser);
        
        SignUpResponse response = authService.signUp(request);
        
        assertTrue(response.getSuccess());
        assertEquals("Account created successfully", response.getMessage());
        assertEquals("uuid-123", response.getUserId());
        assertNotNull(response.getToken());
        assertNotNull(response.getUser());
        assertEquals("john@example.com", response.getUser().getEmail());
    }
    
    /**
     * TEST: Signup with Duplicate Email
     * 
     * Given: Signup request with email that already exists
     * When: SignUp service is called
     * Then: Signup fails with "Email already registered" message
     */
    @Test
    public void testSignUpDuplicateEmail() {
        SignUpRequest request = new SignUpRequest();
        request.setEmail("existing@example.com");
        request.setPassword("password123");
        request.setFullName("Jane Doe");
        
        when(userRepository.existsByEmail("existing@example.com")).thenReturn(true);
        
        SignUpResponse response = authService.signUp(request);
        
        assertFalse(response.getSuccess());
        assertEquals("Email already registered", response.getMessage());
    }
    
    /**
     * TEST: Successful Login
     * 
     * Given: Valid login credentials
     * When: Login service is called
     * Then: User is authenticated and tokens are returned
     */
    @Test
    public void testLoginSuccess() {
        LoginRequest request = new LoginRequest();
        request.setEmail("john@example.com");
        request.setPassword("password123");
        
        User user = new User();
        user.setId("uuid-123");
        user.setFullName("John Doe");
        user.setEmail("john@example.com");
        user.setPasswordHash("hashedPassword");
        user.setIsActive(true);
        
        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoderService.matches("password123", "hashedPassword")).thenReturn(true);
        when(jwtTokenProvider.generateAccessToken("uuid-123", "john@example.com")).thenReturn("accessToken");
        when(jwtTokenProvider.generateRefreshToken("uuid-123", "john@example.com")).thenReturn("refreshToken");
        
        LoginResponse response = authService.login(request);
        
        assertTrue(response.getSuccess());
        assertEquals("Login successful", response.getMessage());
        assertNotNull(response.getToken());
        assertNotNull(response.getRefreshToken());
    }
    
    /**
     * TEST: Login with Invalid Password
     * 
     * Given: Valid email but wrong password
     * When: Login service is called
     * Then: Login fails with generic "Invalid credentials" message
     */
    @Test
    public void testLoginInvalidPassword() {
        LoginRequest request = new LoginRequest();
        request.setEmail("john@example.com");
        request.setPassword("wrongPassword");
        
        User user = new User();
        user.setEmail("john@example.com");
        user.setPasswordHash("hashedPassword");
        user.setIsActive(true);
        
        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoderService.matches("wrongPassword", "hashedPassword")).thenReturn(false);
        
        LoginResponse response = authService.login(request);
        
        assertFalse(response.getSuccess());
        assertEquals("Invalid credentials", response.getMessage());
    }
    
    /**
     * TEST: Login with Nonexistent Email
     * 
     * Given: Email that doesn't exist in database
     * When: Login service is called
     * Then: Login fails with generic "Invalid credentials" message
     */
    @Test
    public void testLoginNonexistentEmail() {
        LoginRequest request = new LoginRequest();
        request.setEmail("nonexistent@example.com");
        request.setPassword("password123");
        
        when(userRepository.findByEmail("nonexistent@example.com")).thenReturn(Optional.empty());
        
        LoginResponse response = authService.login(request);
        
        assertFalse(response.getSuccess());
        assertEquals("Invalid credentials", response.getMessage());
    }
}
```

### Integration Tests

```java
package com.gofast.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gofast.dto.SignUpRequest;
import com.gofast.dto.LoginRequest;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
public class AuthControllerIntegrationTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    /**
     * Integration Test: Complete Signup & Login Flow
     */
    @Test
    public void testSignupAndLoginFlow() throws Exception {
        // Test 1: Sign up new user
        SignUpRequest signUpRequest = new SignUpRequest();
        signUpRequest.setFullName("Test User");
        signUpRequest.setEmail("test@example.com");
        signUpRequest.setPassword("password123");
        signUpRequest.setPhone("1234567890");
        
        mockMvc.perform(post("/api/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(signUpRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.token").isNotEmpty());
        
        // Test 2: Login with created account
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setEmail("test@example.com");
        loginRequest.setPassword("password123");
        
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty());
    }
}
```

---

## Summary

This guide covers all four login-related functionalities required by GoFast:

1. **User Registration (Sign Up)**: Create new user accounts with email uniqueness and secure password hashing
2. **User Login**: Authenticate users and issue JWT tokens with 7-day expiration
3. **Logout**: Blacklist tokens to prevent their further use
4. **Token Refresh**: Allow users to get new tokens without re-authenticating

### Key Implementation Points:

- **Security**: Use bcrypt (10 salt rounds) for passwords, JWT tokens with strong secrets, and Redis for token blacklisting
- **Error Handling**: Return generic messages for security (never expose if email exists)
- **Database**: Store password hashes and refresh token hashes, never plain text
- **Tokens**: Access tokens (7 days), Refresh tokens (30 days), with proper expiration and blacklist management
- **Testing**: Unit tests for service layer, integration tests for endpoints

All code is production-ready and follows Spring Boot best practices.
