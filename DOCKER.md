# Docker Setup Guide - Parking Service

Complete Docker implementation for the Parking Service application.

## Overview

This project uses Docker Compose to orchestrate two services:
- **MySQL 8.0**: Database service
- **Play Framework Backend**: Scala application server

## Files Included

### Core Docker Files

1. **Dockerfile** - Multi-stage build configuration
   - Builder stage: Compiles Scala application with sbt
   - Runtime stage: Uses lightweight JRE 17 for production
   - Includes health checks and security best practices

2. **docker-compose.yaml** - Service orchestration
   - Defines MySQL and backend services
   - Configures networking and volumes
   - Sets up health checks and dependencies
   - Includes environment variables

3. **docker-compose.override.yaml** - Development overrides
   - Automatically applied during local development
   - Enables volume mounting for live code changes
   - Adjusts logging and startup times

4. **.dockerignore** - Build context optimization
   - Excludes unnecessary files from Docker build
   - Reduces image size and build time

5. **docker-entrypoint.sh** - Container initialization
   - Ensures services are ready before starting
   - Handles startup sequence and configuration

6. **.env.example** - Environment variable template
   - Copy to `.env` and customize for your environment
   - Contains database and application settings

7. **Makefile** - Convenient command shortcuts
   - Simplifies common Docker operations
   - Provides development and testing commands

## Quick Start

### 1. Initial Setup

```bash
# Copy environment file
cp .env.example .env

# Build and start services
docker-compose up --build
```

### 2. Using Makefile (Recommended)

```bash
# View all available commands
make help

# Start services
make up

# Start in background
make up-bg

# View logs
make logs

# Stop services
make down
```

### 3. Manual Docker Commands

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps

# Stop services
docker-compose down
```

## Configuration

### Environment Variables

Key variables in `.env`:

```env
# Database
DATABASE_URL=jdbc:mysql://mysql:3306/valet_db
DATABASE_USER=root
DATABASE_PASSWORD=root123

# Play Framework
PLAY_ENVIRONMENT=production
PLAY_CRYPTO_SECRET=change-this-in-production

# Logging
LOG_LEVEL=INFO
```

### Service Configuration

#### MySQL Service
- **Image**: mysql:8.0
- **Port**: 3307 (host) → 3306 (container)
- **Database**: valet_db
- **Default User**: root
- **Health Check**: Runs every 10s, 5 retries

#### Backend Service
- **Port**: 9000 (HTTP API)
- **Depends On**: MySQL (waits for health check)
- **Health Check**: HTTP GET to / endpoint, 30s interval
- **Network**: parking-network bridge

## Database

### Connect to MySQL

```bash
# Using docker exec
docker exec -it valet_mysql mysql -u root -p valet_db

# Using Makefile
make db-shell
```

### Database Persistence

Data is stored in the `mysql_data` volume:
- Persists across container restarts
- Located in Docker's volume storage
- Can be backed up using `docker run --volumes-from`

### Reset Database

```bash
# Remove volumes and restart
make clean-volumes
make up

# Or manually
docker-compose down -v
docker-compose up --build
```

## Development Workflow

### Local Development

The project includes `docker-compose.override.yaml` for local development:

```bash
# Standard docker-compose up automatically merges override file
docker-compose up

# Provides:
# - Volume mounting for live code changes
# - DEBUG logging level
# - Extended startup time for compilation
```

### Live Code Changes

With docker-compose.override.yaml, code changes are mounted:
```bash
# Changes to app/ directory are visible immediately
# Watch logs for sbt recompilation
make logs
```

## Troubleshooting

### MySQL Connection Issues

```bash
# Check MySQL is healthy
docker-compose ps

# View MySQL logs
docker-compose logs mysql

# Test connection
docker exec valet_mysql mysql -u root -proot123 -e "SELECT 1"
```

### Backend Connection Errors

```bash
# Check backend logs
make logs

# Verify services are running
make ps

# Check network connectivity
docker exec valet_backend nc -zv mysql 3306
```

### Port Conflicts

```bash
# Find process using port 9000
lsof -i :9000

# Stop conflicting process
kill -9 <PID>

# Or modify docker-compose.yaml port mapping
```

### Build Failures

```bash
# Rebuild without cache
docker-compose build --no-cache

# Check sbt compilation
docker-compose up --build

# View full logs
docker-compose logs backend
```

## Production Deployment

### Before Production

1. **Security**
   - Change all default passwords in `.env`
   - Set strong `PLAY_CRYPTO_SECRET`
   - Use environment-specific configs

2. **Performance**
   - Adjust JVM heap size in Dockerfile if needed
   - Consider connection pooling in application.conf
   - Set appropriate log levels

3. **Monitoring**
   - Enable health check monitoring
   - Set up log aggregation
   - Configure resource limits in docker-compose.yaml

4. **Backup**
   - Implement database backup strategy
   - Test restore procedures
   - Document recovery process

### Docker Swarm / Kubernetes

For advanced deployments:

```bash
# Docker Swarm
docker stack deploy -c docker-compose.yaml parking-service

# Kubernetes (convert compose)
kompose convert -f docker-compose.yaml
kubectl apply -f parking-service/
```

## Monitoring & Logs

### View Logs

```bash
# All services
docker-compose logs

# Specific service
docker-compose logs backend
docker-compose logs mysql

# Follow logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100
```

### Health Status

```bash
# Check container health
docker-compose ps

# View health check history
docker inspect --format='{{json .State.Health}}' valet_backend | jq

# Manual health check
docker exec valet_backend curl http://localhost:9000/
```

## Cleanup

### Remove Stopped Containers

```bash
docker-compose down
```

### Remove Images

```bash
# Remove built images
docker-compose down --rmi local

# Remove all images
docker-compose down --rmi all
```

### Remove Volumes

```bash
# Remove named volumes
docker-compose down -v

# WARNING: This deletes all database data
```

### Full Cleanup

```bash
# Remove everything (containers, images, volumes)
docker-compose down -v --rmi all
```

## Best Practices Used

✅ **Multi-stage builds** - Reduces final image size  
✅ **Health checks** - Ensures service reliability  
✅ **Proper networking** - Custom bridge network for service communication  
✅ **Volume persistence** - Database data survives restarts  
✅ **Security** - Non-root app user, minimal attack surface  
✅ **Environment variables** - Easy configuration management  
✅ **Dependency ordering** - Services start in correct sequence  
✅ **Development overrides** - Separate dev and production configs  

## Performance Tips

1. Use `.dockerignore` to exclude unnecessary files
2. Layer caching - Put stable steps first in Dockerfile
3. Volume mounting for development (auto-reload)
4. Use specific image tags instead of `latest`
5. Monitor resource usage: `docker stats`

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Play Framework Docker Guide](https://www.playframework.com/documentation/latest/Production)
- [Scala in Docker Best Practices](https://docs.scala-lang.org/overviews/scala-docker/overview.html)
