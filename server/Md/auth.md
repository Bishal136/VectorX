Here's a **compact, simple documentation** for frontend developers and backend testers about the VectorX authentication system:

---

# VectorX Auth System — Developer & Tester Guide

## 1. Quick Overview

| Role | How to Get Account | Login Method |
|------|-------------------|--------------|
| **User** | Self-register via `/api/auth/register` | Email/Password or Google |
| **Seller** | Self-register via `/api/auth/register` (role="seller") | Email/Password or Google |
| **Admin** | Seeded only (cannot self-register) | Email/Password only |

---

## 2. Authentication Flow

```
[Register] → [Verify OTP] → [Login] → [JWT Access Token]
                                    ↓
                            [Refresh Token] → Get new access token
```

---

## 3. Public Endpoints (No Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register User or Seller |
| POST | `/api/auth/verify-otp` | Verify OTP email |
| POST | `/api/auth/login` | Login with email/password |
| GET | `/api/auth/google` | Start Google OAuth |
| GET | `/api/auth/google/callback` | Google OAuth callback |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password with OTP |
| POST | `/api/auth/seed-admin` | Create admin (secret required) |

---

## 4. Private Endpoints (Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/profile` | Get current user profile |
| GET | `/api/auth/check-role` | Check user role |
| POST | `/api/auth/logout` | Logout (revoke refresh token) |

---

## 5. Role-Based Access Rules

### 5.1 Registration Rules
- **Users** → Register with `role: "user"` (default)
- **Sellers** → Register with `role: "seller"`
- **Admins** → Cannot register (seeded only)

### 5.2 Login Rules
- **Users** → Login → Access User panel only
- **Sellers** → Login → Access Seller panel only
- **Admins** → Login → Access Admin panel only

### 5.3 Access Control
```
User Panel      → Role: user
Seller Panel    → Role: seller  
Admin Panel     → Role: admin
```

---

## 6. Registration Examples

### 6.1 Register a User
```json
POST /api/auth/register
{
  "name": "Farhana",
  "email": "farhana@example.com",
  "password": "password123",
  "phone": "+8801234567890",
  "role": "user"  // optional, default is "user"
}
```

### 6.2 Register a Seller
```json
POST /api/auth/register
{
  "name": "Shopkeeper Rahim",
  "email": "rahim@shop.com",
  "password": "password123",
  "phone": "+8809876543210",
  "role": "seller"  // required for seller
}
```

### 6.3 Response
```json
{
  "success": true,
  "message": "User registered successfully. Please verify your email with OTP.",
  "data": {
    "id": "665f...",
    "name": "Farhana",
    "email": "farhana@example.com",
    "role": "user",
    "isVerified": false
  }
}
```

---

## 7. Login Examples

### 7.1 Manual Login
```json
POST /api/auth/login
{
  "email": "farhana@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "abc123...",
    "user": {
      "id": "665f...",
      "name": "Farhana",
      "email": "farhana@example.com",
      "role": "user",
      "isVerified": true
    }
  }
}
```

### 7.2 Google Login
```
GET /api/auth/google
→ Redirects to Google login
→ After success, redirects to:
   FRONTEND_URL/oauth-success?accessToken=...&refreshToken=...
```

---

## 8. Token Management

### 8.1 Use Access Token in Requests
```javascript
Authorization: Bearer eyJhbGciOi...
```

### 8.2 Refresh Token
```json
POST /api/auth/refresh
{
  "refreshToken": "abc123..."
}
```

### 8.3 Logout
```json
POST /api/auth/logout
Authorization: Bearer eyJhbGciOi...
{
  "refreshToken": "abc123..."  // optional — revoke specific token
}
```

---

## 9. Admin Account (Seeded Only)

### 9.1 Create Admin (One-time)
```bash
npm run seed
```

Creates:
```
Email: admin@vectorx.com
Password: admin123
Role: admin
```

### 9.2 Admin Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard` | Platform stats |
| GET | `/api/admin/users` | List all users |
| PUT | `/api/admin/users/:id/block` | Block/unblock user |
| GET | `/api/admin/sellers` | List all sellers |
| PUT | `/api/admin/sellers/:id/verify` | Approve/reject seller |

---

## 10. Testing Checklist

### 10.1 For Backend Testers

| Test Case | Expected Result |
|-----------|----------------|
| Register user with valid data | 201 Created + OTP sent |
| Register with existing email | 400 Bad Request |
| Verify OTP with correct code | 200 Success + user.isVerified = true |
| Login with unverified account | 401 Unauthorized |
| Login with blocked account | 403 Forbidden |
| Login with wrong password | 401 Unauthorized |
| Google OAuth flow | Redirect + tokens returned |
| Refresh with valid refresh token | New access token returned |
| Refresh with expired token | 401 Unauthorized |
| Logout | Refresh token revoked |
| Access admin route as user | 403 Forbidden |
| Access seller route as user | 403 Forbidden |

### 10.2 For Frontend Developers

| Feature | Implementation Notes |
|---------|---------------------|
| Register form | Send role="user" or "seller" |
| OTP input | 6-digit code, auto-submit on complete |
| Login form | Email + password |
| Google button | Link to `/api/auth/google` |
| Token storage | Store accessToken + refreshToken in localStorage |
| Axios interceptor | Attach Bearer token to all requests |
| 401 handling | Redirect to login + clear storage |
| Role-based routing | Redirect based on `user.role` |
| OAuth success page | Parse URL params for tokens |

---

## 11. Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Server Error |

---

## 12. Environment Variables (Required)

```env
# Auth
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Admin Seed
ADMIN_SEED_SECRET=your-seed-secret
ADMIN_DEFAULT_PASSWORD=admin123

# Frontend
FRONTEND_URL=http://localhost:5173
```

---

## 13. Quick Summary Table

| Action | Endpoint | Auth | Who Can |
|--------|----------|------|---------|
| Register | `/api/auth/register` | None | User, Seller | ✅
| Verify OTP | `/api/auth/verify-otp` | None | All | ✅
| Login | `/api/auth/login` | None | All | ✅
| Google Login | `/api/auth/google` | None | All |
| Refresh Token | `/api/auth/refresh` | None | All (with refresh token) |
| Get Profile | `/api/auth/profile` | JWT | All |
| Check Role | `/api/auth/check-role` | JWT | All |
| Logout | `/api/auth/logout` | JWT | All |
| Seed Admin | `/api/auth/seed-admin` | Secret | Script only |

---

## 14. Important Notes

1. **Users** → Default role, can register
2. **Sellers** → Must register with `role: "seller"`
3. **Admins** → Only via seed script, never via registration
4. **OTP** → Sent to email, valid for 10 minutes
5. **Google Auth** → Auto-verifies email, no OTP needed
6. **Token Expiry** → Access: 7 days, Refresh: 30 days

---

That's it! Simple, compact, and covers everything frontend devs and backend testers need.