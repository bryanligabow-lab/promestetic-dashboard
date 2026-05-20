#!/bin/sh
set -e

# La DB vive en el volumen montado /app/data (vacío al primer deploy).
# El schema vive en /app/prisma/schema.prisma (de la imagen).
echo "[entrypoint] DATABASE_URL=$DATABASE_URL"
echo "[entrypoint] working dir: $(pwd)"
echo "[entrypoint] schema: $(ls -la /app/prisma/schema.prisma 2>&1)"
echo "[entrypoint] /app/data: $(ls -la /app/data 2>&1)"

# Aplica el schema con db push. NO suprimimos errores para verlos.
echo "[entrypoint] aplicando schema Prisma..."
cd /app
# Pin versión 5.22.0 — más reciente no soporta env() en schema files.
npx -y prisma@5.22.0 db push --schema=/app/prisma/schema.prisma --skip-generate --accept-data-loss

echo "[entrypoint] arrancando Next.js..."
exec node server.js
