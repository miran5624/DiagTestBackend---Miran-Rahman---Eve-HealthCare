#!/usr/bin/env bash
# wait-for-db.sh
set -e

# We just wait for localhost 5432 to be accepting connections
until node -e "require('net').connect(5432, 'localhost').on('error', () => process.exit(1)).on('connect', () => process.exit(0))"
do
  echo "Waiting for postgres on localhost:5432..."
  sleep 1
done

echo "Postgres is up"
