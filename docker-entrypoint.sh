#!/bin/sh
set -e

# Aplica el schema de Prisma sobre la DB (crea tablas si no existen).
# Usa db push para SQLite (no necesitamos migraciones formales en este proyecto).
echo "[entrypoint] aplicando schema Prisma..."
npx prisma db push --skip-generate --accept-data-loss=false || true

echo "[entrypoint] arrancando Next.js..."
exec node server.js
