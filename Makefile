.PHONY: help build up down logs clean restart ps lint test

help:
	@echo "Parking Service - Docker & Development Commands"
	@echo ""
	@echo "Docker Commands:"
	@echo "  make build           - Build Docker images"
	@echo "  make up              - Start all services"
	@echo "  make up-bg           - Start services in background"
	@echo "  make down            - Stop all services"
	@echo "  make restart         - Restart all services"
	@echo "  make ps              - Show running containers"
	@echo "  make logs            - View backend logs"
	@echo "  make logs-db         - View database logs"
	@echo "  make clean           - Stop services and remove containers"
	@echo "  make clean-volumes   - Remove volumes (WARNING: deletes data)"
	@echo ""
	@echo "Development Commands:"
	@echo "  make dev             - Run application in development mode"
	@echo "  make test            - Run tests"
	@echo "  make build-local     - Build project locally"
	@echo ""
	@echo "Database Commands:"
	@echo "  make db-shell        - Connect to MySQL shell"
	@echo "  make db-reset        - Reset database (WARNING: deletes data)"

# Docker Commands
build:
	docker-compose build

up:
	docker-compose up --build

up-bg:
	docker-compose up -d --build

down:
	docker-compose down

restart:
	docker-compose restart

ps:
	docker-compose ps

logs:
	docker-compose logs -f backend

logs-db:
	docker-compose logs -f mysql

clean:
	docker-compose down

clean-volumes:
	docker-compose down -v

# Development Commands
dev:
	sbt run

test:
	sbt test

build-local:
	sbt compile

# Database Commands
db-shell:
	docker exec -it valet_mysql mysql -u root -p -D valet_db

db-reset:
	docker-compose down -v
	docker-compose up -d --build
	@echo "Database has been reset"

# Docker registry commands (if needed)
push-registry:
	docker tag parking-service:latest your-registry/parking-service:latest
	docker push your-registry/parking-service:latest
