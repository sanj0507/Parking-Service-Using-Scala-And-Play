docker-compose logs -f mysql
docker-compose down
## Parking Visit & Valet Management API

A REST API backend built using Play Framework, Scala, Slick, MySQL, and Docker for managing parking visits and valet workflows.

The system supports:
- Vehicle check-in/check-out
- Valet workflow management
- Visit status tracking
- Add-on services
- Activity logging
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

### Layers

| Layer | Responsibility |
|---|---|
| Controller | Handles API requests/responses |
| Service | Business logic |
| Repository | Database operations |
| MySQL | Persistent storage |

---

# Features

## Parking Visit Management

- Vehicle Check-In
- Vehicle Check-Out
- Get Visit Details
- Get All Visits

## Valet Workflow

- Request Vehicle
- Acknowledge Request
- Mark Vehicle Ready
- Track Visit Status

## Additional Services

- Car Wash
- Priority Parking

## Activity Logging

- Track valet workflow activities
- Store visit activity history

---

# Visit Status Workflow

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

---

# Docker Setup

## Prerequisites

Install:

- Docker Desktop
- Docker Compose

---

# Running the Application Using Docker

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

## Health Check

### GET /hello

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

## 4. Request Vehicle

### POST /visits/:id/request-vehicle

Updates visit status:

```text
CheckedIn → Requested
```

---

## 5. Acknowledge Request

### POST /visits/:id/acknowledge

Updates visit status:

```text
Requested → InProgress
```

---

## 6. Vehicle Ready

### POST /visits/:id/ready

Updates visit status:

```text
InProgress → Ready
```

---

## 7. Add-On Service

### POST /visits/:id/add-on

### Request Body

```json
{
  "service": "Car Wash"
}
```

---

## 8. Check-Out Vehicle

### POST /visits/:id/check-out

Updates visit status:

```text
Ready → CheckedOut
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

Configured using:

```text
conf/application.conf
```

Database:
- MySQL 8.0
- Database Name: valet_db

---

# Learning Progress

## Day 1
- Play Framework setup
- MVC architecture
- First API endpoint

## Day 2
- MySQL integration
- Slick ORM
- Repository and service layers

## Day 3
- Visit model creation
- POST check-in API
- End-to-end DB flow

## Day 4
- Docker integration
- REST API expansion
- Workflow APIs
- Status management

---

add this to reasme


