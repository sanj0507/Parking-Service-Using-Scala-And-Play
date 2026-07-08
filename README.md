Parking Visit & Valet Management System

A robust, full-stack application for managing valet parking check-ins, retrieval workflows, and add-on services. This project features a high-performance **Scala + Play Framework REST API** backend, and dual frontend options: a built-in server-rendered dashboard and a modern **React + Vite + Chakra UI** console.

---

## Key Features

1. **Authentication & Role-Based Access Control**:
   - Secure sign-up/login flow with JWT-based authentication.
   - **Service Advisor (User)**: Manages check-ins, requests vehicle retrieval, requests checkout, and logs add-on services.
   - **Valet Attendant**: Acknowledges retrieval requests, processes vehicles, executes/tracks add-on services, and marks vehicles ready.
   - **Admin**: Approves new user sign-ups via dashboard, supervises all active visits, tracks histories, and runs administrative controls.
2. **Visit Status Lifecycle**:
   - `CheckedIn` ➔ `Requested` ➔ `InProgress` (Acknowledged) ➔ `Ready` (Ready for pickup) ➔ `CheckedOut`
3. **Add-on Services Tracking**:
   - Real-time management of extra tasks like `Car Wash` and `Priority Parking` with statuses: `Pending` ➔ `InProgress` ➔ `Completed`.
4. **Dual Frontend Options**:
   - A built-in SSR server dashboard.
   - An interactive React single-page console with Chakra UI theme and animations.

---

## Tech Stack

### Backend
- **Scala** & **Play Framework** (MVC REST API)
- **Slick ORM** for database mapping
- **MySQL** database
- **Redis** for high-performance authentication caching
- **Kafka** & **Mailpit** for asynchronous email notifications upon role approval
- **JWT (JSON Web Tokens)** for stateless authentication

### Frontend
- **React 18**
- **Vite** (build tool and dev server with proxy support)
- **Chakra UI** & **Emotion** (for styling and layouts)
- **Framer Motion** (micro-animations)

---

## Project Structure

```text
├── app/
│   ├── actions/         # Custom Play Actions (e.g., Role-based request filtering)
│   ├── controllers/     # REST API Controllers (HomeController, VisitController)
│   ├── models/          # Slick model definitions (Visit, AddOnRequest, Role)
│   ├── repository/      # Slick Database queries (VisitRepository)
│   └── views/           # Scala HTML templates (Built-in server-side frontend)
├── conf/
│   ├── application.conf # Backend configuration (DB source, ports, CSRF)
│   └── routes           # Play Framework HTTP route definitions
├── src/                 # React frontend source files
│   ├── api/             # API client integrations
│   ├── App.jsx          # Main React Application
│   ├── main.jsx         # React application entry point
│   └── theme.js         # Chakra UI theme customizations
├── public/              # Static assets for the Scala templates
├── Dockerfile           # Docker configuration for backend
├── docker-compose.yaml  # Docker Compose configuration for backend & MySQL database
└── package.json         # Node.js frontend configuration
```

---

## Database Schema

The database relies on a relational structure defined via Slick:

### 1. `users` Table
Manages system users and roles for authentication.

| Column | Type | Attributes | Description |
|---|---|---|---|
| `id` | `Long` | Primary Key, Auto-increment | User Identifier |
| `username` | `String` | Non-null, Unique (255) | User's unique login handle |
| `email` | `String` | Non-null, Unique (255) | User's email address for notifications |
| `password_hash` | `String` | Non-null | BCrypt hashed password |
| `role` | `String` | Non-null | User's role (`Pending`, `Admin`, `Valet`, `Service Advisor`) |

### 2. `visits` Table
Holds core data for each parking visit.

| Column | Type | Attributes | Description |
|---|---|---|---|
| `id` | `Long` | Primary Key, Auto-increment | Visit Identifier |
| `vehicle_number` | `String` | Non-null | Vehicle license plate number |
| `customer_name` | `String` | Non-null | Owner of the vehicle |
| `status` | `String` | Non-null | Current visit status (e.g., `CheckedIn`, `Requested`, `Ready`) |
| `created_at` | `String` | Non-null | Date/time of check-in |

### 2. `add_on_requests` Table
Tracks secondary services attached to a specific visit.

| Column | Type | Attributes | Description |
|---|---|---|---|
| `id` | `Long` | Primary Key, Auto-increment | Request Identifier |
| `visit_id` | `Long` | Foreign Key (visits) | Reference to the associated visit |
| `service_name` | `String` | Non-null | Name of the service (e.g., `Car Wash`) |
| `status` | `String` | Non-null | Service status (`Pending`, `InProgress`, `Completed`) |
| `created_at` | `String` | Non-null | Date/time the service was requested |

---

## Getting Started

### Prerequisites
- **Java 17**
- **Node.js** (v18 or higher)
- **SBT** (Scala Build Tool)
- **Docker & Docker Compose** (optional)

---

## Run with Docker

This builds the Play application and runs a MySQL instance inside Docker containers.

```bash
# Build and run containers
docker-compose up --build

# Run in background (detached mode)
docker-compose up -d --build

# Stop the containers
docker-compose down
```
- **Backend API**: available at `http://localhost:9000`
- **Frontend Console**: available at `http://localhost:3000`
- **Database**: MySQL running on port `3307`
- **Mailpit (Email Server)**: Web interface available at `http://localhost:8025`

---

## Local Development Setup

If you prefer to run the backend and frontend separately for development:

### 1. Set Up Database
Ensure MySQL is running on your machine, create a database named `parking_db`, and configure the credentials in `conf/application.conf`:
```hocon
slick.dbs.default.db {
  url = "jdbc:mysql://localhost:3306/parking_db"
  user = "root"
  password = "your_password"
}
```

### 2. Start Play Backend API
```bash
sbt run
```
The backend API and server-rendered templates will start at **`http://localhost:9000`**. You can visit:
* Service Advisor UI: `http://localhost:9000/user`
* Valet Console UI: `http://localhost:9000/valet`
* Admin Dashboard UI: `http://localhost:9000/admin`

### 3. Start React Frontend Console
Open a new terminal window to start the Vite development server:
```bash
# Install npm dependencies
npm install

# Start Vite dev server
npm run dev
```
The React frontend console will start at **`http://localhost:3000`**. 

Vite is configured to proxy all `/api` requests automatically to `http://localhost:9000`.

---

## API Documentation

All API requests require role validation passed through the custom header `X-User-Role`. Allowed header values are:
* `"Service Advisor"` or `"Admin"` (Access checking in, requesting, and checkout actions)
* `"Valet"` or `"Admin"` (Access acknowledging, marking ready, starting/completing add-on tasks)

### Endpoints Overview

| HTTP Method | Path | Allowed Roles | Request Body / Action |
|---|---|---|---|
| `POST` | `/api/user/visits/check-in` | Service Advisor, Admin | Check-in new vehicle |
| `GET` | `/api/admin/visits` | Admin | Get list of all visits |
| `GET` | `/api/user/visits/:id` | Valet, Service Advisor, Admin | Get details of a single visit |
| `POST` | `/api/user/visits/:id/request-vehicle` | Service Advisor, Admin | Request vehicle retrieval |
| `POST` | `/api/valet/visits/:id/acknowledge` | Valet, Admin | Valet begins retrieval |
| `POST` | `/api/valet/visits/:id/ready` | Valet, Admin | Mark vehicle ready for customer |
| `POST` | `/api/user/visits/:id/add-ons` | Service Advisor, Admin | Request add-on service |
| `GET` | `/api/valet/visits/:id/add-ons` | Valet, Service Advisor, Admin | Get add-on requests for visit |
| `POST` | `/api/valet/visits/:id/add-ons/start` | Valet, Admin | Start add-on service |
| `POST` | `/api/valet/visits/:id/add-ons/complete`| Valet, Admin | Complete add-on service |
| `POST` | `/api/valet/visits/:id/check-out` | Valet, Admin | Check-out vehicle |

### Curl Command Examples

#### 1. Check-In a Vehicle (Service Advisor)
```bash
curl -i -X POST \
  -H "X-User-Role: Service Advisor" \
  -H "Content-Type: application/json" \
  -d '{"vehicleNumber": "KA01AB1234", "customerName": "Alice", "status": "CheckedIn"}' \
  http://localhost:9000/api/user/visits/check-in
```

#### 2. Request Vehicle Retrieval (Service Advisor)
```bash
curl -i -X POST \
  -H "X-User-Role: Service Advisor" \
  http://localhost:9000/api/user/visits/1/request-vehicle
```

#### 3. Start Add-on Service (Valet)
```bash
curl -i -X POST \
  -H "X-User-Role: Valet" \
  -H "Content-Type: application/json" \
  -d '{"service": "Car Wash"}' \
  http://localhost:9000/api/valet/visits/1/add-ons/start
```
