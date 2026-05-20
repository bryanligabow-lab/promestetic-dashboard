# Promestetic — Dashboard de Chatbot WhatsApp

Dashboard para configurar y operar un chatbot de WhatsApp conectado a [Evolution API](https://doc.evolution-api.com/), con cerebro en **Anthropic Claude**.

## ✨ Qué incluye

- **Empresa**: nombre, contacto, logo, horarios semanales, zona horaria.
- **Chatbot**: system prompt, plantilla user, reglas duras, mensajes automáticos, modelo, temperatura, prueba en vivo.
- **Catálogo**: productos, servicios e info. Lo que esté **activo** se inyecta como contexto al bot (RAG simple).
- **Promociones**: crear con texto + imagen, **botón "Enviar ahora"**, programar a una fecha/hora, o repetir con cron. Segmentar por tags de cliente. Auto-envío al crear.
- **Clientes (CRM)**: alta manual o automática (al recibir WhatsApp). Tags, notas, opt-out.
- **Conversaciones**: historial WhatsApp por cliente con vista tipo chat.
- **WhatsApp**: crear instancia en Evolution API, QR para vincular, ver estado, desconectar.
- **Webhook**: recibe mensajes entrantes, los guarda y dispara la respuesta de Claude usando el contexto de empresa + catálogo + reglas.
- **Scheduler**: `node-cron` para promociones programadas (one-shot y recurrentes).
- **Horarios**: el bot puede responder con mensaje custom fuera de horario.

## 🚀 Setup

```bash
# 1) Instalar dependencias
npm install

# 2) Configurar variables de entorno
cp .env.example .env
# Edita .env y pon tu ANTHROPIC_API_KEY (y, cuando tengas, EVOLUTION_API_URL/KEY)

# 3) Crear y poblar la base de datos
npx prisma db push
npm run db:seed

# 4) Arrancar
npm run dev
```

Abre http://localhost:3000 → te redirige a `/dashboard`.

## 🔑 Variables de entorno

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | URL de Prisma (default SQLite `file:./dev.db`) |
| `ANTHROPIC_API_KEY` | Tu key de Anthropic |
| `CLAUDE_MODEL` | Modelo (default `claude-sonnet-4-6`) |
| `EVOLUTION_API_URL` | URL de tu Evolution API (ej `http://localhost:8080`) |
| `EVOLUTION_API_KEY` | API key de Evolution |
| `EVOLUTION_INSTANCE_NAME` | Nombre de la instancia (ej `promestetic`) |
| `PUBLIC_BASE_URL` | URL pública de este server para que Evolution te llegue al webhook. En dev usa `ngrok http 3000` y pega la URL https. |
| `WEBHOOK_SECRET` | (opcional, para validación futura) |

## 📞 Conexión con WhatsApp (Evolution API)

1. Levanta tu Evolution API (Docker u otro).
2. Pon `EVOLUTION_API_URL` y `EVOLUTION_API_KEY` en `.env`.
3. Expón tu dashboard con un túnel: `ngrok http 3000` y copia la URL en `PUBLIC_BASE_URL`.
4. Ve a `/dashboard/whatsapp` → **Crear instancia** → **Generar QR** → escanea con tu WhatsApp.
5. Cuando el estado pase a `connected`, ya recibes mensajes y el bot responde.

## 🎯 Cómo funciona el chatbot

Cuando llega un mensaje al webhook `/api/webhook/evolution`:

1. Se crea/actualiza el **cliente** y la **conversación**.
2. Se guarda el mensaje entrante.
3. Si la conversación no está pausada y el bot está activo:
   - Si `respectHours=true` y estamos fuera de horario → envía `offHoursMessage`.
   - Si es el primer mensaje del cliente → envía `welcomeMessage`.
   - Llama a Claude con: `systemPrompt` + contexto auto-generado (empresa, horarios, catálogo activo) + reglas duras + historial.
   - Envía la respuesta por WhatsApp y la guarda.

## 📣 Promociones

Tres formas de enviar una promoción:

- **Botón "Enviar ahora"** en cada promoción del listado.
- **Programada**: pones `scheduledAt` y el scheduler revisa cada minuto.
- **Recurrente**: pones `cronExpr` (ej `0 10 * * 1` = lunes 10 AM) y se ejecuta en bucle.
- **Auto-envío al crear**: switch en el formulario de nueva promoción.

Segmentación: si pones tags en `targetTags`, solo envía a clientes que tengan al menos uno de esos tags. Si vacío → todos los clientes no opted-out.

## 🗂 Estructura

```
src/
├── app/
│   ├── dashboard/        # UI del dashboard (server + client components)
│   ├── api/              # Routes (REST) para cada recurso
│   ├── layout.tsx
│   └── page.tsx
├── components/           # UI compartida (Sidebar, ImageUpload, primitivas)
├── lib/
│   ├── prisma.ts         # singleton de Prisma
│   ├── claude.ts         # cliente Anthropic + builder de contexto
│   ├── evolution.ts      # cliente Evolution API
│   ├── promotions.ts     # lógica de envío masivo
│   ├── scheduler.ts      # node-cron + one-shots
│   ├── hours.ts          # business hours check
│   └── utils.ts
prisma/
├── schema.prisma         # schema con Company, ChatbotConfig, CatalogItem, Promotion, Client, Conversation, Message, WhatsAppInstance, PromotionSend
└── seed.ts               # datos demo (Promestetic)
```

## 🔒 Notas de seguridad (demo)

- No hay autenticación. Antes de exponer a internet pon NextAuth (o pásalo detrás de Cloudflare Access).
- El webhook no valida firma. Cuando tu Evolution lo soporte, añade un check con `WEBHOOK_SECRET`.

## 🛣 Roadmap sugerido

- [ ] Autenticación (NextAuth)
- [ ] Multi-empresa
- [ ] Migración a Postgres
- [ ] Subida de imágenes a S3/R2
- [ ] Métricas y reportes
- [ ] Plantillas de mensaje rápidas para agentes humanos

---

## 🚀 Deploy en EasyPanel

1. **Crear app**: en EasyPanel → tu proyecto → New service → **App**
2. **Source**: GitHub → conecta el repo `promestetic-dashboard`
3. **Build**: tipo **Dockerfile** (raíz)
4. **Port**: `3000`
5. **Domains**: añade el dominio (ej. `dashboard.tudominio.com`) o usa el subdominio gratis de EasyPanel
6. **Mounts (volúmenes persistentes)** — IMPORTANTE para no perder datos:
   - `/app/prisma` → para `dev.db`
   - `/app/public/uploads` → para imágenes de promos
7. **Environment variables** (copia de `.env.example`):
   - `EVOLUTION_API_URL` → URL interna o pública de tu Evolution API
   - `EVOLUTION_API_KEY` → tu API key de Evolution
   - `EVOLUTION_INSTANCE_NAME` → nombre del instance creado en Evolution Manager
   - `DATABASE_URL` → `file:./prisma/dev.db`
   - `BOT_ENABLED` → `false` (sin IA) o `true` (con IA)
   - `AUTH_USER` → usuario del login
   - `AUTH_PASSWORD` → contraseña del login
   - `AUTH_SECRET` → string aleatorio largo (firma de la cookie)
8. **Deploy** y abre el dominio. Login con tus credenciales.

### Para que esté siempre prendido
- En EasyPanel → tu app → Settings → **Restart Policy**: `always`
- Cualquier restart del servidor/contenedor recupera el estado desde el volumen persistente.
