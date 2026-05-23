#!/bin/sh
set -e

# La DB vive en el volumen montado /app/data (vacío al primer deploy).
# El schema vive en /app/prisma/schema.prisma (de la imagen).
echo "[entrypoint] DATABASE_URL=$DATABASE_URL"
echo "[entrypoint] working dir: $(pwd)"
echo "[entrypoint] schema: $(ls -la /app/prisma/schema.prisma 2>&1)"
echo "[entrypoint] /app/data: $(ls -la /app/data 2>&1)"

# ============================================================
# BACKUP AUTOMÁTICO DE LA DB ANTES DE TOCAR EL SCHEMA
# ============================================================
# Cada vez que arranca el contenedor, copiamos la DB actual a
# /app/data/backups/dev-YYYYMMDD-HHMMSS.db ANTES de aplicar
# cualquier cambio de schema. Esto garantiza que aunque algo
# salga mal con `prisma db push`, siempre podemos restaurar.
#
# Se mantienen los últimos 20 backups (se borran los más viejos).
mkdir -p /app/data/backups
if [ -f /app/data/dev.db ]; then
  TS=$(date +%Y%m%d-%H%M%S)
  BAK="/app/data/backups/dev-${TS}.db"
  echo "[entrypoint] 💾 Backup de DB → $BAK"
  cp /app/data/dev.db "$BAK"
  # Rotación: dejar solo los 20 más recientes
  ls -1t /app/data/backups/dev-*.db 2>/dev/null | tail -n +21 | xargs rm -f 2>/dev/null || true
  echo "[entrypoint] Backups actuales: $(ls /app/data/backups/ | wc -l)"
else
  echo "[entrypoint] (no hay DB previa, primer arranque)"
fi

# ============================================================
# APLICAR SCHEMA SIN PERDER DATOS
# ============================================================
# IMPORTANTE: NO usamos --accept-data-loss para evitar que Prisma
# borre tablas/columnas silenciosamente. Si hay un cambio
# incompatible, db push FALLA y el contenedor no arranca → el
# operador debe revisar manualmente.
echo "[entrypoint] aplicando schema Prisma (modo seguro, sin data loss)..."
cd /app
if ! npx -y prisma@5.22.0 db push --schema=/app/prisma/schema.prisma --skip-generate 2>&1; then
  echo "[entrypoint] ❌ db push falló."
  echo "[entrypoint] Probablemente hay un cambio incompatible en el schema"
  echo "[entrypoint] que requeriría borrar datos. NO se borra nada."
  echo "[entrypoint] Restaura desde /app/data/backups/ si hace falta."
  exit 1
fi

echo "[entrypoint] arrancando Next.js..."
exec node server.js
