import fs from 'fs/promises';
import path from 'path';
import { prisma } from './prisma';
import { evolution } from './evolution';
import { parseJson } from './utils';

interface SendResult {
  promotionId: string;
  total: number;
  sent: number;
  failed: number;
  errors: { phone: string; error: string }[];
}

/**
 * Envía una promoción a todos los clientes que cumplen el target.
 * - Filtra por tags (si la promo tiene targetTags) y por optedOut=false.
 * - Si la promo tiene imageUrl, envía como media + caption; si no, solo texto.
 * - Espacia los envíos para no ser baneado por WhatsApp.
 */
export async function sendPromotion(promotionId: string): Promise<SendResult> {
  const promo = await prisma.promotion.findUnique({ where: { id: promotionId } });
  if (!promo) throw new Error('Promoción no encontrada');
  if (!promo.active) throw new Error('La promoción está desactivada');

  const targetTags = parseJson<string[]>(promo.targetTags, []);

  const clients = await prisma.client.findMany({
    where: { optedOut: false },
  });

  // Filtro en memoria por tags (SQLite no soporta JSON array contains)
  const filtered = targetTags.length
    ? clients.filter((c) => {
        const ct = parseJson<string[]>(c.tags, []);
        return targetTags.some((t) => ct.includes(t));
      })
    : clients;

  const result: SendResult = {
    promotionId,
    total: filtered.length,
    sent: 0,
    failed: 0,
    errors: [],
  };

  for (const client of filtered) {
    try {
      if (promo.imageUrl) {
        // Si la imagen está en /uploads/ (archivo local), la mandamos como base64
        // para no depender de URL pública. Si ya es http(s), la mandamos como URL.
        if (promo.imageUrl.startsWith('/uploads/')) {
          const filePath = path.join(process.cwd(), 'public', promo.imageUrl);
          const buf = await fs.readFile(filePath);
          const base64 = buf.toString('base64');
          const fileName = path.basename(promo.imageUrl);
          await evolution.sendMediaBase64(client.phone, base64, fileName, promo.message);
        } else {
          await evolution.sendMedia(client.phone, promo.imageUrl, promo.message);
        }
      } else {
        await evolution.sendText(client.phone, promo.message);
      }

      // Registrar envío + mensaje en conversación
      await prisma.$transaction(async (tx) => {
        await tx.promotionSend.create({
          data: { promotionId: promo.id, clientId: client.id, status: 'sent' },
        });
        const conv = await tx.conversation.upsert({
          where: { clientId: client.id },
          update: { lastMsgAt: new Date() },
          create: { clientId: client.id, lastMsgAt: new Date() },
        });
        await tx.message.create({
          data: {
            conversationId: conv.id,
            direction: 'out',
            sender: 'promo',
            content: promo.message,
            mediaUrl: promo.imageUrl,
            mediaType: promo.imageUrl ? 'image' : null,
          },
        });
      });

      result.sent++;
      // Espacio entre envíos (anti-ban)
      await sleep(800 + Math.random() * 600);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      result.failed++;
      result.errors.push({ phone: client.phone, error: msg });
      await prisma.promotionSend.create({
        data: { promotionId: promo.id, clientId: client.id, status: 'failed', error: msg },
      });
    }
  }

  await prisma.promotion.update({
    where: { id: promo.id },
    data: { lastSentAt: new Date(), sendCount: { increment: result.sent } },
  });

  return result;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function toAbsoluteUrl(url: string): string {
  if (url.startsWith('http')) return url;
  const base = process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}
