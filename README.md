# Parking Visit & Valet Management API

A REST API backend built using Play Framework, Scala, Slick ORM, MySQL, and Docker for managing parking visits and valet workflows.

The system supports:
- Vehicle check-in and check-out
- Valet workflow tracking
- Visit status management
- Add-on parking services
- Activity workflow transitions
- Dockerized deployment

---

# Tech Stack

- Scala
- Play Framework
- Slick ORM
- MySQL
- Docker
- Docker Compose
- SBT

---

# Project Architecture

```text
Controller → Service → Repository → MySQL
```

## Layers

| Layer | Responsibility |
|---|---|
| Controller | Handles API requests/responses |
| Service | Business logic |
| Repository | Database access |
| MySQL | Persistent storage |

---

# Features

## Parking Visit Management

- Vehicle Check-In
- Vehicle Check-Out
- Get Visit Details
- Get All Visits

## Valet Workflow

- Customer requests vehicle
- Attendant acknowledges request
- Vehicle marked ready
- Customer checks out vehicle

## Status Tracking

Supports complete valet lifecycle:

```text
CheckedIn
   ↓
Requested
   ↓
InProgress
   ↓
Ready
   ↓
CheckedOut
```

## Add-On Services

- Car Wash
- Priority Parking
- Additional valet services

---

# Docker Setup

## Prerequisites

Install:
- Docker Desktop
- Docker Compose

---

# Run Using Docker

## Build and Start Containers

```bash
docker-compose up --build
```

## Run in Background

```bash
docker-compose up -d --build
```

## Stop Containers

```bash
docker-compose down
```

## View Backend Logs

```bash
docker-compose logs -f backend
```

## View MySQL Logs

```bash
docker-compose logs -f mysql
```

---

# Services

| Service | Container | Port |
|---|---|---|
| Backend | valet_backend | 9000 |
| MySQL | valet_mysql | 3307 |

---

# API Base URL

```text
http://localhost:9000
```

---

# API Endpoints

# Health Check

## GET /hello

Returns test response.

---

# Parking Visit APIs

## 1. Check-In Vehicle

### POST /check-in

### Request Body

```json
{
  "vehicleNumber": "KA01AB1234",
  "customerName": "Alice",
  "status": "CheckedIn"
}
```

---

## 2. Get All Visits

### GET /visits

Returns all parking visits.

---

## 3. Get Visit By ID

### GET /visits/:id

Example:

```text
GET /visits/1
```

---

# Valet Workflow APIs

## 4. Request Vehicle

### POST /visits/:id/request-vehicle

Updates visit status:

```text
CheckedIn → Requested
```

---

## 5. Acknowledge Request

### POST /visits/:id/acknowledge

Valet accepts the request.

Updates status:

```text
Requested → InProgress
```

---

## 6. Vehicle Ready

### POST /visits/:id/ready

Vehicle ready for pickup.

Updates status:

```text
InProgress → Ready
```

---

## 7. Check-Out Vehicle

### POST /visits/:id/check-out

Customer exits parking facility.

Updates status:

```text
Ready → CheckedOut
```

Also updates:
- exit time

---

# Add-On Service API

## 8. Add-On Service

### POST /visits/:id/add-on

### Request Body

```json
{
  "service": "Car Wash"
}
```

---

# Sample Curl Commands

## Get All Visits

```bash
curl -i http://localhost:9000/visits
```

---

## Check-In Vehicle

```bash
curl -i \
-H "Content-Type: application/json" \
-d '{
  "vehicleNumber":"KA01AB1234",
  "customerName":"Alice",
  "status":"CheckedIn"
}' \
http://localhost:9000/check-in
```

---

## Request Vehicle

```bash
curl -X POST \
http://localhost:9000/visits/1/request-vehicle
```

---

## Acknowledge Request

```bash
curl -X POST \
http://localhost:9000/visits/1/acknowledge
```

---

## Mark Vehicle Ready

```bash
curl -X POST \
http://localhost:9000/visits/1/ready
```

---

## Add-On Service

```bash
curl -X POST \
-H "Content-Type: application/json" \
-d '{
  "service":"Car Wash"
}' \
http://localhost:9000/visits/1/add-on
```

---

## Check-Out Vehicle

```bash
curl -X POST \
http://localhost:9000/visits/1/check-out
```

---

# Local Development Setup

## Prerequisites

- Java 17
- SBT
- MySQL

---

# Run Locally

```bash
sbt run
```

Application runs at:

```text
http://localhost:9000
```

---

# Database Configuration

Configured in:

```text
conf/application.conf
```

Database:
- MySQL 8.0
- Database Name: valet_db

---

# Database Schema

## parking_service

| Column | Type |
|---|---|
| id | INT |
| vehicle_number | VARCHAR |
| customer_name | VARCHAR |
| status | VARCHAR |
| valet_name | VARCHAR |
| add_on_service | VARCHAR |
| entry_time | TIMESTAMP |
| exit_time | TIMESTAMP |

---

