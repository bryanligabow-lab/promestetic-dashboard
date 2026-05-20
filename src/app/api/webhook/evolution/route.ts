import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateReply, isClaudeConfigured } from '@/lib/claude';
import { evolution } from '@/lib/evolution';
import { isWithinBusinessHours } from '@/lib/hours';
import { detectsEscalation } from '@/lib/escalation';

/**
 * Webhook de Evolution API.
 *
 * Eventos esperados:
 *  - MESSAGES_UPSERT: mensaje entrante
 *  - CONNECTION_UPDATE: cambio de estado de la instancia
 *
 * Payload aproximado (MESSAGES_UPSERT):
 * {
 *   event: "messages.upsert",
 *   instance: "...",
 *   data: {
 *     key: { remoteJid: "57300...@s.whatsapp.net", fromMe: false, id: "..." },
 *     message: { conversation: "hola" } | { extendedTextMessage: { text: "..." } },
 *     pushName: "Juan",
 *     messageTimestamp: 1700000000,
 *   }
 * }
 */
export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => null);
  if (!payload) return NextResponse.json({ ok: true });

  const event = (payload.event ?? payload.eventName ?? '').toLowerCase();
  console.log('[webhook] event:', event);

  try {
    if (event.includes('connection')) {
      await handleConnection(payload);
    } else if (event.includes('messages.upsert') || event.includes('message')) {
      await handleMessage(payload);
    }
  } catch (e) {
    console.error('[webhook] error:', e);
  }

  return NextResponse.json({ ok: true });
}

async function handleConnection(payload: any) {
  const state = payload?.data?.state ?? payload?.state;
  const phone = payload?.data?.wuid ?? payload?.data?.phoneNumber;
  if (!state) return;
  const status =
    state === 'open' || state === 'connected' ? 'connected' :
    state === 'connecting' ? 'qr_pending' : 'disconnected';
  const inst = await prisma.whatsAppInstance.findFirst();
  if (inst) {
    await prisma.whatsAppInstance.update({
      where: { id: inst.id },
      data: { status, phoneNumber: phone ?? inst.phoneNumber, lastSyncAt: new Date() },
    });
  }
}

async function handleMessage(payload: any) {
  const data = payload?.data ?? payload;
  // Ignorar mensajes salientes
  if (data?.key?.fromMe) return;

  const jid: string = data?.key?.remoteJid ?? '';
  if (!jid || jid.endsWith('@g.us')) return; // ignorar grupos

  const phone = jid.split('@')[0].replace(/\D/g, '');
  if (!phone) return;

  const text: string =
    data?.message?.conversation ||
    data?.message?.extendedTextMessage?.text ||
    data?.message?.imageMessage?.caption ||
    '';

  if (!text.trim()) return;

  const pushName: string | undefined = data?.pushName;
  const externalId: string | undefined = data?.key?.id;

  // Upsert cliente
  const client = await prisma.client.upsert({
    where: { phone },
    update: { lastSeenAt: new Date(), name: pushName || undefined },
    create: { phone, name: pushName ?? null, lastSeenAt: new Date() },
  });

  // Upsert conversación
  const conv = await prisma.conversation.upsert({
    where: { clientId: client.id },
    update: { lastMsgAt: new Date() },
    create: { clientId: client.id, lastMsgAt: new Date() },
    include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
  });

  // Guardar mensaje entrante
  await prisma.message.create({
    data: {
      conversationId: conv.id,
      direction: 'in',
      sender: 'client',
      content: text,
      externalId,
    },
  });

  // Detectar si pide ayuda de un asesor
  const esc = detectsEscalation(text);
  if (esc.needsHelp && !conv.needsHumanHelp) {
    await prisma.conversation.update({
      where: { id: conv.id },
      data: {
        needsHumanHelp: true,
        helpRequestedAt: new Date(),
        helpReason: esc.reason ?? 'keyword',
      },
    });
  }

  // Si está pausada, no responde el bot
  if (conv.paused) return;

  // Gate global por env var. Útil para producción sin IA.
  if (process.env.BOT_ENABLED !== 'true') return;

  const cfg = await prisma.chatbotConfig.findFirst();
  if (!cfg || !cfg.enabled) return;
  if (!(await isClaudeConfigured())) {
    console.warn('[webhook] Claude no configurado, no se responde.');
    return;
  }

  // Horarios
  const company = await prisma.company.findFirst();
  if (cfg.respectHours && company) {
    if (!isWithinBusinessHours(company.hours, company.timezone)) {
      const msg = cfg.offHoursMessage || 'Fuera de horario. Te responderemos pronto.';
      await sendAndRecord(conv.id, phone, msg, 'system');
      return;
    }
  }

  // Bienvenida si es primer mensaje
  const msgCount = await prisma.message.count({ where: { conversationId: conv.id } });
  if (msgCount === 1 && cfg.welcomeMessage) {
    await sendAndRecord(conv.id, phone, cfg.welcomeMessage, 'bot');
  }

  // Historial para Claude (último 20 mensajes)
  const history = await prisma.message.findMany({
    where: { conversationId: conv.id },
    orderBy: { createdAt: 'asc' },
    take: 20,
  });
  const claudeHistory = history
    .filter((m) => m.id) // skip current (ya guardado, lo añadimos como incoming abajo? no — está en history)
    .slice(0, -1) // quitamos el último, que es el incoming actual
    .map((m) => ({
      role: m.direction === 'in' ? 'user' : 'assistant',
      content: m.content,
    })) as { role: 'user' | 'assistant'; content: string }[];

  const reply = await generateReply({
    history: claudeHistory,
    incoming: text,
    clientName: client.name,
    clientPhone: phone,
  });

  await sendAndRecord(conv.id, phone, reply, 'bot');
}

async function sendAndRecord(
  conversationId: string,
  phone: string,
  text: string,
  sender: 'bot' | 'system' | 'agent'
) {
  try {
    await evolution.sendText(phone, text);
  } catch (e) {
    console.error('[webhook] sendText failed:', e);
  }
  await prisma.message.create({
    data: { conversationId, direction: 'out', sender, content: text },
  });
}
