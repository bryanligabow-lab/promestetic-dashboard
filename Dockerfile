# ----------- 1) Dependencias -----------
FROM node:20-alpine AS deps
WORKDIR /app

# Necesario para mejor compatibilidad con prisma
RUN apk add --no-cache libc6-compat openssl

COPY package.json package-lock.json* ./
RUN npm ci

# ----------- 2) Build -----------
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# DATABASE_URL placeholder solo para el build.
# En runtime se sobreescribe con la env var real del contenedor.
ENV DATABASE_URL="file:./prisma/build.db"
# Evita que Next intente conectarse a la DB durante el pre-render
ENV NEXT_TELEMETRY_DISABLED=1

# Genera cliente Prisma y compila Next
RUN npx prisma generate
RUN npx prisma db push --skip-generate --accept-data-loss
RUN npm run build

# ----------- 3) Runtime -----------
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

ENV NODE_ENV=production
ENV PORT=3000
# Acepta conexiones desde fuera del contenedor
ENV HOSTNAME=0.0.0.0

# Usuario no-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Next.js standalone: copia el server + assets
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma: necesitamos el schema y el cliente generado en runtime
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Script de arranque: aplica migraciones y arranca el server
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# /app/data: directorio donde se monta el volumen persistente (DB)
# /app/public/uploads: idem para imágenes
RUN mkdir -p /app/data /app/public/uploads && \
    chown -R nextjs:nodejs /app/data /app/public/uploads

USER nextjs

EXPOSE 3000

CMD ["./docker-entrypoint.sh"]
