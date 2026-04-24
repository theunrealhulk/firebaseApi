# Firebase REST API - Express width Typescript 

A REST API with Firebase Authentication, Firestore database, role-based access control, and comprehensive testing.

## Tech Stack & Packages

### Core
- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **TypeScript** - Type safety
- **tsx** - TypeScript execution

### Firebase
- **firebase-admin** - Server-side Firebase SDK
- Firebase Auth (Authentication)
- Cloud Firestore (Database)

### Utilities
- **dotenv** - Environment variables
- **@faker-js/faker** - Seed data generation

### Testing
- **Jest** - Test runner
- **supertest** - HTTP assertions
- **ts-jest** - TypeScript support

## Requirements to Run the API

1. **Node.js** v18+ installed
2. **Firebase Project** with:
   - Authentication enabled
   - Cloud Firestore database
   - Service Account credentials

## Firestore Setup (Google Cloud Console)

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project" → Name it (e.g., "my-api")
3. Disable Google Analytics (optional) → Create project

### 2. Enable Authentication
1. In Firebase Console → **Authentication** → **Get started**
2. Click **Email/Password**
3. Enable both:
   - Email/Password
   - Email link (passwordless)
4. Click **Save**

### 3. Create Firestore Database
1. Firebase Console → **Firestore Database** → **Create database**
2. Choose **Start in test mode** (for development)
3. Select a location closest to your users
4. Click **Create**

### 4. Enable Required APIs
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Go to **APIs & Services** → **Library**
4. Enable these APIs:
   - **Firebase Authentication API**
   - **Cloud Firestore API**

## Required Setup for API Authentication

### 1. Get Firebase Web API Key
1. Firebase Console → **Project Settings** (gear icon)
2. Scroll to "Your apps" → Click **Web** (`</>`)
3. Register app → Copy **Web API Key**

### 2. Get Service Account Credentials
1. Firebase Console → **Project Settings** → **Service Accounts**
2. Click **Firebase Admin SDK** → **Generate new private key**
3. Download the JSON file
4. Save it as `config/serviceAccountKey.json` in your project

## Environment Variables (.env)

Create a `.env` file in the project root:

```env
# Firebase
FIREBASE_WEB_API_KEY=your_web_api_key_here

# Server
PORT=5000
NODE_ENV=development
LOG_LEVEL=info
```

### How to Get Values

| Variable | Where to Find |
|----------|---------------|
| `FIREBASE_WEB_API_KEY` | Firebase Console → Project Settings → Web API Key |
| `PORT` | Your choice (default: 5000) |
| `NODE_ENV` | `development` or `production` |
| `LOG_LEVEL` | `debug`, `info`, `warn`, `error` (default: `info`) |

### Service Account Setup

1. Download the JSON from Firebase Console → Project Settings → Service Accounts
2. Place it at: `config/serviceAccountKey.json`

The API auto-loads credentials from this file at startup.

## API Features

| Feature | Description |
|---------|-------------|
| **JWT Authentication** | Token-based auth via Bearer header |
| **Refresh Tokens** | Long-lived tokens for session renewal |
| **Role-Based Access** | Admin & Client roles via Firebase Custom Claims |
| **Pagination** | Query params: `?page=1&limit=20` |
| **Search/Filter** | Query param: `?search=term` |
| **Input Validation** | Built-in validation on all endpoints |
| **Unit Testing** | Jest with mocked Firebase |
| **Integration Testing** | Self-contained route tests |
| **Seed Data** | Faker-based test data generation |

## Endpoint Description

### Authentication (`/auth`)

| Method | Endpoint | Description | Required Middleware | Role |
|--------|----------|-------------|---------------------|------|
| POST | `/auth/register` | Register new user | - | - |
| POST | `/auth/login` | User login | - | - |
| POST | `/auth/refresh` | Refresh access token | - | - |
| POST | `/auth/logout` | Revoke tokens | Bearer Token | Any |

### Products (`/products`)

| Method | Endpoint | Description | Required Middleware | Role |
|--------|----------|-------------|---------------------|------|
| GET | `/products` | List all products | - | - |
| GET | `/products/:id` | Get single product | - | - |
| POST | `/products` | Create product | Bearer Token | Admin |
| PUT | `/products/:id` | Update product | Bearer Token | Admin |
| DELETE | `/products/:id` | Delete product | Bearer Token | Admin |

### Orders (`/orders`)

| Method | Endpoint | Description | Required Middleware | Role |
|--------|----------|-------------|---------------------|------|
| POST | `/orders` | Create order | Bearer Token | Any |
| GET | `/orders` | Get user's orders | Bearer Token | Client |
| GET | `/orders/all` | Get all orders | Bearer Token | Admin |
| GET | `/orders/:id/items` | Get order details | Bearer Token | Any |
| PATCH | `/orders/:id/status` | Update order status | Bearer Token | Admin |

### Admin (`/admin`)

| Method | Endpoint | Description | Required Middleware | Role |
|--------|----------|-------------|---------------------|------|
| GET | `/admin/users` | List all users | Bearer Token | Admin |
| POST | `/admin/set-role` | Set user role | Bearer Token | Admin |

## NPM Scripts

```bash
# Development
npm run start        # Run API with tsx
npm run dev         # Run API with hot reload (nodemon)

# Testing
npm run test              # Run all tests
npm run test:unit         # Run unit tests only
npm run test:integration  # Run integration tests only
npm run test:watch        # Run tests in watch mode
npm run test:coverage     # Run tests with coverage report

# Utilities
npm run seed    # Generate test data (1000 products, 8 users, 128 orders)
npm run repl    # Interactive Firebase REPL for debugging
```

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your values

# 3. Place service account in config/serviceAccountKey.json

# 4. run seed to populate db with dummy data (ps users password is :"Password123!" first user is Admin)
npm run seed
# 5. Run development server
npm run dev

# 6. Run tests
npm run test
```

## Project Structure

```
├── config/
│   └── serviceAccountKey.json   # Firebase credentials
├── controllers/
│   ├── adminController.ts         # Admin operations
│   ├── authController.ts          # Authentication
│   ├── orderController.ts          # Order management
│   └── productController.ts        # Product management
├── middleware/
│   └── authMiddlware.ts           # Auth & role middleware
├── models/
│   ├── Order.ts
│   ├── OrderItem.ts
│   └── Product.ts
├── routes/
│   ├── admin.ts
│   ├── authentication.ts
│   ├── orders.ts
│   └── products.ts
├── types/
│   ├── requests/                  # Request DTOs
│   └── response/                 # Response types
├── utils/
│   ├── firebase.ts               # Firebase initialization
│   ├── pagination.ts             # Pagination utilities
│   └── responseTransform.ts      # Response transformers
├── __mocks__/
│   └── firebase.ts               # Mock Firebase for tests
├── __tests__/
│   ├── admin.test.ts
│   ├── auth.test.ts
│   ├── integration.test.ts
│   ├── order.test.ts
│   └── product.test.ts
├── main.ts                       # App entry point
├── seed.ts                       # Database seeder
├── repl.ts                       # Interactive REPL
└── jest.config.ts                # Jest configuration
```

## Response Format

### Success Response
```json
{
    "data": [...],
    "pagination": {
        "page": 1,
        "limit": 20,
        "total": 100,
        "totalPages": 5,
        "hasNext": true,
        "hasPrev": false
    }
}
```

### Error Response
```json
{
    "error": "Error message here"
}
```

## Authentication Flow

1. **Register/Login** → Returns `idToken` + `refreshToken`
2. **Store tokens** → Client stores `idToken` (expires in 1 hour)
3. **API Requests** → Send `Authorization: Bearer <idToken>`
4. **Token Expired** → Use `refreshToken` via `/auth/refresh`
5. **Logout** → Server revokes refresh tokens

## Role System

| Role | Permissions |
|------|-------------|
| `admin` | Full access to all endpoints |
| `client` | Can only access own orders, read products |

First seeded user is automatically assigned `admin` role.