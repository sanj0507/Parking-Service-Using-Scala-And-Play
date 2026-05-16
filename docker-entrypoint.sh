#!/bin/bash
set -e

echo "Starting Parking Service..."

# Wait for MySQL to be ready
if [ -n "$DATABASE_HOST" ]; then
  echo "Waiting for MySQL to be ready at $DATABASE_HOST..."
  until nc -z "$DATABASE_HOST" "${DATABASE_PORT:-3306}"; do
    echo "MySQL is unavailable - sleeping"
    sleep 1
  done
  echo "MySQL is up - executing application"
fi

# Execute the main application
exec "$@"
