# NeuroHire AI Backend Server

Backend API server for the NeuroHire AI recruitment platform.

## Features

- 🔐 **Authentication & Authorization**
  - User registration and login
  - Google OAuth integration
  - JWT token-based authentication
  - Role-based access control (Candidate, Recruiter, Admin)

- 🛡️ **Security**
  - Password hashing with bcrypt
  - Rate limiting
  - CORS protection
  - Helmet security headers
  - Input validation and sanitization

- 📊 **Database**
  - MongoDB Atlas integration
  - Mongoose ODM
  - User profiles and management
  - Data validation and indexing

## Setup Instructions

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

Update the following variables in `.env`:
- `MONGODB_URI` - Your MongoDB Atlas connection string
- `JWT_SECRET` - A secure random string for JWT signing
- `PORT` - Server port (default: 5000)
- `FRONTEND_URL` - Your frontend URL for CORS

### 3. Start the Server

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

## API Endpoints

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| POST | `/register` | Register new user | Public |
| POST | `/login` | User login | Public |
| POST | `/google` | Google OAuth login | Public |
| GET | `/me` | Get current user profile | Private |
| PUT | `/profile` | Update user profile | Private |
| POST | `/logout` | Logout user | Private |

### Health Check
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health status |

## Request/Response Examples

### Register User
```bash
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword",
  "role": "candidate"
}
```

### Login User
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword"
}
```

### Google OAuth
```bash
POST /api/auth/google
Content-Type: application/json

{
  "email": "john@gmail.com",
  "name": "John Doe",
  "avatar": "https://lh3.googleusercontent.com/...",
  "googleId": "google_user_id",
  "role": "candidate"
}
```

## Authentication

Include JWT token in requests:
```bash
Authorization: Bearer <your_jwt_token>
```

## Error Handling

All API responses follow this format:
```json
{
  "success": true/false,
  "message": "Response message",
  "data": {}, // Only on success
  "errors": [] // Only on validation errors
}
```

## Development

- Uses ES6 modules
- Nodemon for auto-restart in development
- Comprehensive error handling
- Input validation with express-validator
- MongoDB connection with automatic reconnection

## Security Features

- Password hashing with bcrypt (cost: 12)
- JWT tokens with expiration
- Rate limiting (100 requests per 15 minutes)
- CORS protection
- Helmet security headers
- Input validation and sanitization
- MongoDB injection protection