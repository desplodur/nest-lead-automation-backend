#!/bin/sh
set -e

# Migrations beim Start (mit Retry, falls DB noch nicht bereit)
if [ -n "$DATABASE_URL" ]; then
  echo "Running database migrations..."
  for i in 1 2 3 4 5; do
    if npx prisma migrate deploy; then
      echo "Migrations completed."
      break
    fi
    if [ "$i" = 5 ]; then
      echo "Migrations failed after 5 attempts."
      exit 1
    fi
    echo "Migration attempt $i failed, retrying in 3s..."
    sleep 3
  done
fi

exec node dist/src/main.js
