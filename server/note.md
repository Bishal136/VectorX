npm init -y
npm install express mongoose dotenv cors bcryptjs jsonwebtoken
npm install -D nodemon
mkdir -p src/config src/models src/controllers src/routes src/middlewares src/services src/utils
mkdir tests
touch .env .gitignore README.md



Now you write auth system backend for my ecommerce website.
feture :
1.google login system 
2.manual login system
3.user and seller logon but admin always fix
4.
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Register with role, email/phone, password | Public |
| POST | `/api/auth/verify-otp` | Verify OTP sent to email/phone | Public |
| POST | `/api/auth/login` | Login, returns JWT | Public |
| POST | `/api/auth/refresh` | Refresh access token | Public (refresh token) |
| POST | `/api/auth/forgot-password` | Trigger reset email | Public |

**Example — `POST /api/auth/login`**
```json
// Request
{ "email": "farhana@example.com", "password": "••••••••" }

// Response 200
{
  "success": true,
  "data": {
    "token": "eyJhbGciOi...",
    "user": { "id": "665f...", "name": "Farhana", "role": "user", "isVerified": true }
  }
}
```

