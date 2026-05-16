# Stage 1: Build stage
FROM eclipse-temurin:17-jdk-jammy AS builder

WORKDIR /app

# Install sbt with minimal dependencies
RUN apt-get update && \
    apt-get install -y curl && \
    curl -L https://github.com/sbt/sbt/releases/download/v1.9.6/sbt-1.9.6.tgz | tar xzf - -C /opt && \
    rm -rf /var/lib/apt/lists/* && \
    ln -s /opt/sbt/bin/sbt /usr/local/bin/sbt

COPY . .

# Build the application
RUN sbt stage

# Stage 2: Runtime stage
FROM eclipse-temurin:17-jre

WORKDIR /app

RUN apt-get update && apt-get install -y curl netcat-traditional && rm -rf /var/lib/apt/lists/*

# Copy the built application from the builder stage
COPY --from=builder /app/target/universal/stage/ .

# Create app user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser && \
    chown -R appuser:appuser /app
USER appuser

EXPOSE 9000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:9000/visits || exit 1

CMD ["bin/parking-service", "-Dplay.server.pidfile.path=/dev/null"]
