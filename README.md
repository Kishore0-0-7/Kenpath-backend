# Sweety Backend API Service 🩺🌿

[![CI](https://github.com/Kishore0-0-7/sweety-backend/actions/workflows/ci.yml/badge.svg)](https://github.com/Kishore0-0-7/sweety-backend/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?logo=express)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_Serverless-4169E1?logo=postgresql)](https://neon.tech/)
[![Vitest](https://img.shields.io/badge/Vitest-31_Passed-6E9F18?logo=vitest)](https://vitest.dev/)
[![Swagger](https://img.shields.io/badge/Swagger-OpenAPI_3.0-85EA2D?logo=swagger)](http://localhost:3001/api-docs)

> A robust, type-safe RESTful API backend for the **Sweety Blood Glucose Tracker**, engineered with Node.js, Express, TypeScript, Prisma ORM, and PostgreSQL. Features JWT authentication, strict clinical domain validation, analytics aggregations, Swagger documentation, and a comprehensive 31-test automated suite.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Runtime & Language** | Node.js 20+ & TypeScript 5.6 | Strict static type safety and modern async execution |
| **HTTP Framework** | Express 4.21 | RESTful routing, middleware pipelines, and error handling |
| **Database & ORM** | Neon PostgreSQL & Prisma 5.22 | Relational persistence, connection pooling, and schema migrations |
| **Security & Auth** | JWT (`jsonwebtoken`), `bcryptjs`, `helmet` | Bearer token authorization, password hashing, and HTTP headers |
| **Data Validation** | Zod 3.23 | Strict schema validation at the HTTP boundary |
| **API Documentation** | Swagger UI (`swagger-ui-express`) & OpenAPI 3.0 | Live interactive API exploration at `/api-docs` |
| **Testing Engine** | Vitest 2.1 & Supertest 7.0 | End-to-end integration and clinical rule verification |

---

## 🗄️ Database Schema & Architecture

The database model is managed via Prisma ORM targeting PostgreSQL:

```mermaid
erDiagram
    User ||--o{ GlucoseReading : "logs"
    
    User {
        string id PK "cuid / uuid"
        string email UK "case-insensitive lowercased"
        string name "User full name"
        string passwordHash "bcrypt salted hash"
        datetime createdAt "default now"
        datetime updatedAt "auto-updated"
    }

    GlucoseReading {
        string id PK "cuid / uuid"
        string userId FK "references User.id"
        int glucoseValue "40 to 600 mg/dL integer"
        enum slot "BEFORE_BREAKFAST, AFTER_BREAKFAST, BEFORE_LUNCH, AFTER_LUNCH"
        date recordedDate "YYYY-MM-DD"
        string notes "optional clinical notes (max 500 chars)"
        datetime createdAt "default now"
        datetime updatedAt "auto-updated"
    }
```

### Relational Constraints & Indexes
1. **Per-Day Slot Uniqueness**: `@@unique([userId, recordedDate, slot])` prevents double-logging the same slot on the same day.
2. **Lookup Performance**: `@@index([userId, recordedDate])` optimizes daily dashboard queries and monthly aggregate reports.
3. **Data Cascade**: User deletion cascades cleanly to all associated glucose readings.

---

## 🩺 Clinical Business Rules & Validation

The backend strictly enforces the five clinical constraints mandated for blood glucose safety:

| Rule | Requirement | Validation Mechanism | HTTP Error |
| :--- | :--- | :--- | :--- |
| **Rule 1: Value Presence** | Glucose value must be provided and cannot be empty | Zod schema validation | `400 Bad Request` |
| **Rule 2: Valid Range** | Must be an integer between 40 and 600 mg/dL | Range check `val >= 40 && val <= 600 && Number.isInteger(val)` | `400 Bad Request` |
| **Rule 3: Slot Uniqueness** | One reading per time slot per day per user | Prisma compound unique constraint check | `409 Conflict` |
| **Rule 4: Daily Maximum** | At most 4 readings per calendar day per user | Count query check prior to creation | `400 Bad Request` |
| **Rule 5: No Future Dates** | Readings cannot be logged with a date ahead of today | Strict date comparison against application timezone | `400 Bad Request` |

---

## 📡 RESTful API Reference

Interactive OpenAPI documentation is live at **`http://localhost:3001/api-docs`**.

### 1. Health & Status
- `GET /health` — Returns system operational status, database connectivity, and server timezone.

### 2. Authentication
- `POST /api/auth/register` — Create a new user account (`name`, `email`, `password`).
- `POST /api/auth/login` — Authenticate user and receive JWT Bearer token.
- `GET /api/auth/me` — Retrieve currently authenticated user profile (requires `Bearer` token).
- `POST /api/auth/logout` — Invalidate client session.

### 3. Glucose Readings
- `GET /api/readings` — List user readings with optional filtering (`date`, `startDate`, `endDate`, `slot`, pagination).
- `POST /api/readings` — Record a new glucose measurement (enforces Rules 1–5).
- `GET /api/readings/:id` — Retrieve reading details by ID (scoped to authenticated user).
- `PUT /api/readings/:id` — Update glucose value, slot, date, or notes.
- `DELETE /api/readings/:id` — Delete reading (scoped to authenticated user).

### 4. Reports & Clinical Analytics
- `GET /api/reports/daily?date=YYYY-MM-DD` — Daily statistical summary (`min`, `max`, `avg`, count, readings by slot).
- `GET /api/reports/month-to-date?date=YYYY-MM-DD` — MTD summary covering day 1 to specified date.
- `GET /api/reports/monthly?date=YYYY-MM-DD` — Previous full calendar month summary.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ installed
- PostgreSQL database (or free Neon PostgreSQL connection string)

### 1. Installation
```bash
git clone https://github.com/Kishore0-0-7/sweety-backend.git
cd sweety-backend
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root of the backend folder:
```env
NODE_ENV=development
PORT=3001
DATABASE_URL="postgresql://user:password@ep-small-haze-pooler.aws.neon.tech/neondb?sslmode=require&schema=sweety"
JWT_SECRET="sweety-super-secret-jwt-key-2026-production"
JWT_EXPIRES_IN="7d"
CORS_ORIGIN="http://localhost:5173"
APP_TIMEZONE="Asia/Kolkata"
```

### 3. Database Migration & Seed
```bash
# Push schema to PostgreSQL database
npm run db:push

# Seed demo user and sample readings
npm run db:seed
```

Demo account seeded:
- **Email:** `demo@sweety.health`
- **Password:** `Password123!`

### 4. Run Development Server
```bash
npm run dev
```
The server will start at `http://localhost:3001` with Swagger docs at `http://localhost:3001/api-docs`.

---

## 🧪 Automated Testing

The backend includes a comprehensive 31-test integration suite covering authentication, authorization, CRUD operations, cross-user isolation, error conditions, and clinical rule enforcement.

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

---

## 🐳 Docker & Production Deployment

### Docker Container
```bash
docker build -t sweety-backend .
docker run -p 3001:3001 --env-file .env sweety-backend
```

### Render Deployment
This repository includes a `render.yaml` blueprint. Link this repository to Render and deploy as a Node Web Service.
Build Command: `npm install && npx prisma generate && npm run build`
Start Command: `npm start`
Health Check: `/health`

---

## 📄 License
MIT © 2026 Sweety Health Inc.
