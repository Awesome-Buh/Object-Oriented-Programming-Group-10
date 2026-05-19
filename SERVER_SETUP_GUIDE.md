# GoFast Backend - Server Setup & Database Configuration Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Application Configuration](#application-configuration)
4. [Running the Server](#running-the-server)
5. [API Endpoints](#api-endpoints)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before running the GoFast backend server, ensure you have:

- **Java 17 or higher** installed
  ```bash
  java -version
  ```
  
- **Maven 3.8.0 or higher** (included via Maven Wrapper)
  ```bash
  mvn -version
  ```

- **MySQL 8.0 or higher** running and accessible
  ```bash
  mysql --version
  ```

- **Redis** (optional, but recommended for token blacklisting)
  ```bash
  redis-cli --version
  ```

---

## Database Setup

### Step 1: Create MySQL Database

1. **Connect to MySQL:**
   ```bash
   mysql -u root -p
   ```

2. **Create the GoFast database:**
   ```sql
   CREATE DATABASE gofast_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

3. **Create a database user:**
   ```sql
   CREATE USER 'gofast_user'@'localhost' IDENTIFIED BY 'GoFast@2025';
   GRANT ALL PRIVILEGES ON gofast_db.* TO 'gofast_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

4. **Import the schema:**
   ```bash
   mysql -u gofast_user -p gofast_db < "A. GoFast.sql"
   ```
   
   When prompted, enter the password: `GoFast@2025`

### Step 2: Verify Database Tables

```bash
mysql -u gofast_user -p gofast_db
```

```sql
SHOW TABLES;
DESCRIBE users;
```

You should see the `users` table with columns:
- `id` (UUID)
- `full_name`
- `email` (unique)
- `password_hash`
- `phone`
- `refresh_token_hash`
- `refresh_token_expiry`
- `created_at`
- `updated_at`
- `last_login`
- `is_active`

---

## Application Configuration

### Step 1: Update application.properties

Edit: `gofast-backend/src/main/resources/application.properties`

```properties
# Server Configuration
server.port=8080
server.servlet.context-path=/api

# Database Configuration
spring.datasource.url=jdbc:mysql://localhost:3306/gofast_db
spring.datasource.username=gofast_user
spring.datasource.password=GoFast@2025
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver

# JPA/Hibernate Configuration
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQL8Dialect
spring.jpa.properties.hibernate.format_sql=true

# Redis Configuration (for token blacklist)
spring.redis.host=localhost
spring.redis.port=6379
spring.redis.timeout=60000
spring.redis.jedis.pool.max-active=8
spring.redis.jedis.pool.max-idle=8

# JWT Configuration
app.jwtSecret=mySecretKeyForJWTTokenGenerationAndValidationThatIsAtLeast32CharsLong12345
app.jwtExpirationMs=3600000
app.refreshTokenExpirationMs=2592000000

# Logging
logging.level.root=INFO
logging.level.com.gofast=DEBUG
```

**Important:** For production, update:
- `app.jwtSecret` - Use a strong random string (min 32 chars)
- `spring.datasource.password` - Use a strong password
- `spring.jpa.hibernate.ddl-auto=validate` - Don't auto-create tables

---

## Running the Server

### Option 1: Using Maven Wrapper (Recommended)

1. **Navigate to project directory:**
   ```bash
   cd "c:\Users\harees computers\Desktop\Web Projects\A. GoFast\gofast-backend"
   ```

2. **Run the application:**
   ```bash
   .\mvnw.cmd spring-boot:run
   ```

3. **Expected output:**
   ```
   [INFO] Spring Boot startup successful
   [INFO] Tomcat started on port 8080 with context path '/api'
   ```

4. **Test the server:**
   ```bash
   curl http://localhost:8080/api/auth/login
   ```

### Option 2: Build JAR & Run

1. **Build the project:**
   ```bash
   .\mvnw.cmd clean package
   ```

2. **Run the JAR:**
   ```bash
   java -jar target/gofast-backend-0.0.1-SNAPSHOT.jar
   ```

### Option 3: Run from IDE (VS Code)

1. Open Command Palette (Ctrl+Shift+P)
2. Search: **"Java: Run Project"**
3. Or click the **"Run"** button in the main class file

---

## API Endpoints

### Base URL
```
http://localhost:8080/api
```

### 1. User Sign Up
```http
POST /auth/signup
Content-Type: application/json

{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "phone": "+1234567890"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Account created successfully",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "token": "eyJhbGc...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890"
  }
}
```

### 2. User Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890"
  }
}
```

### 3. Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Tokens refreshed successfully",
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

### 4. User Logout
```http
POST /auth/logout
Authorization: Bearer eyJhbGc...
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Frontend Integration

### Update Frontend API Base URL

Edit: `Scripts/Login.js` and other frontend files

```javascript
// Add at the top of each JS file
const API_BASE_URL = 'http://localhost:8080/api';

// Example: Sign up API call
async function handleSignup(formData) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Store tokens
      localStorage.setItem('accessToken', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Redirect to dashboard
      window.location.href = 'gofast-working.html';
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error('Signup error:', error);
  }
}
```

### Add Authorization Header to Requests

```javascript
// Helper function for authenticated requests
async function apiCall(endpoint, method = 'GET', body = null) {
  const token = localStorage.getItem('accessToken');
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  return response.json();
}
```

---

## Troubleshooting

### Issue: "Connection refused" - Database not running

**Solution:**
```bash
# Start MySQL service
# Windows
net start MySQL80

# macOS
brew services start mysql

# Linux
sudo systemctl start mysql
```

### Issue: "Access Denied" - Database credentials wrong

**Check credentials in application.properties:**
```properties
spring.datasource.url=jdbc:mysql://localhost:3306/gofast_db
spring.datasource.username=gofast_user
spring.datasource.password=GoFast@2025
```

### Issue: "Port 8080 already in use"

**Change port in application.properties:**
```properties
server.port=8081
```

Or kill the existing process:
```bash
netstat -ano | findstr :8080
taskkill /PID <PID> /F
```

### Issue: Redis connection errors (if using)

**Solution 1: Start Redis**
```bash
redis-server
```

**Solution 2: Disable Redis temporarily**
Comment out in `application.properties`:
```properties
# spring.redis.host=localhost
# spring.redis.port=6379
```

### Issue: "Variable is never read" warnings in IDE

**This is normal** - Lombok generates getters/setters automatically. The code will compile fine. These are just IDE warnings.

### Issue: JWT Token Expired

**JWT Token expires after 1 hour.** Use the refresh endpoint to get a new token:
```bash
curl -X POST http://localhost:8080/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "your_refresh_token"}'
```

---

## Project Structure

```
gofast-backend/
├── pom.xml                          # Maven dependencies
├── src/main/
│   ├── java/com/gofast/
│   │   ├── controller/              # REST endpoints
│   │   ├── service/                 # Business logic
│   │   ├── entity/                  # Database entities
│   │   ├── dto/                     # Data transfer objects
│   │   ├── repository/              # Database access
│   │   ├── config/                  # Security configuration
│   │   └── filter/                  # JWT authentication
│   └── resources/
│       └── application.properties   # Configuration
└── target/                          # Compiled output
```

---

## Security Notes

1. **Never commit secrets** - Use environment variables:
   ```properties
   spring.datasource.password=${DB_PASSWORD}
   app.jwtSecret=${JWT_SECRET}
   ```

2. **Use HTTPS in production** - Not just HTTP

3. **Keep JWT secret strong** - At least 32 random characters

4. **Set `ddl-auto=validate`** in production - Don't auto-create tables

5. **Enable CORS carefully** - Only allow your frontend domain

---

## Next Steps

1. ✅ Start MySQL server
2. ✅ Create database and user
3. ✅ Update `application.properties` with your credentials
4. ✅ Run the backend server
5. ✅ Update frontend JavaScript files with API base URL
6. ✅ Test sign-up/login endpoints
7. ✅ Connect frontend to backend

---

## Support

For issues or questions:
- Check the logs: `target/` folder contains build output
- Test endpoints with Postman or curl
- Verify database connection with `mysql` CLI

---

**GoFast Backend Setup Complete!** 🚀
