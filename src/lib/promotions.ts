import fs from 'fs/promises';
import path from 'path';
import { prisma } from './prisma';
import { evolution } from './evolution';
import { parseJson } from './utils';
import {
  dedupePhones,
  isClientBouncedOut,
  isValidPhone,
  nextPhase,
  shouldUsePausePhases,
} from './antispam';

interface SendResult {
  promotionId: string;
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  skippedReasons: Record<string, number>;
  errors: { phone: string; error: string }[];
}

/**
 * Envía una promoción a todos los clientes que cumplen el target.
 *
 * Filtros antispam aplicados ANTES de mandar:
 * 1. optedOut = false (cliente NO se dio de baja)
 * 2. isSpam = false (no es un contacto spammer)
 * 3. bounceCount < 3 (no es un número que ya fallé varias veces)
 * 4. teléfono con formato válido
 * 5. deduplicado por número (mismo número solo cuenta 1 vez)
 *
 * Rate limiting: usa políticas adaptativas según el tamaño de la lista.
 * Para 7000 contactos: lotes de 100, 3 min entre lotes, 2s entre mensajes.
 */
export async function sendPromotion(promotionId: string): Promise<SendResult> {
  const promo = await prisma.promotion.findUnique({ where: { id: promotionId } });
  if (!promo) throw new Error('Promoción no encontrada');
  if (!promo.active) throw new Error('La promoción está desactivada');

  const targetTags = parseJson<string[]>(promo.targetTags, []);

  // Sacamos todos los candidatos (sin filtrar todavía en SQL para poder loggear razones)
  const candidates = await prisma.client.findMany();

  const result: SendResult = {
    promotionId,
    total: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    skippedReasons: {},
    errors: [],
  };

  function skip(reason: string) {
    result.skipped++;
    result.skippedReasons[reason] = (result.skippedReasons[reason] ?? 0) + 1;
  }

  // FILTROS ANTISPAM
  const filtered: typeof candidates = [];
  for (const c of candidates) {
    if (c.optedOut) { skip('opted_out'); continue; }
    if (c.isSpam) { skip('marked_spam'); continue; }
    if (isClientBouncedOut(c.bounceCount)) { skip('bounced_out'); continue; }
    if (!isValidPhone(c.phone)) { skip('invalid_phone'); continue; }

    if (targetTags.length) {
      const ct = parseJson<string[]>(c.tags, []);
      if (!targetTags.some((t) => ct.includes(t))) { skip('tag_mismatch'); continue; }
    }
    filtered.push(c);
  }

  // Deduplicar por número (mismo número distintos clientes → 1 envío)
  const recipients = dedupePhones(filtered);
  const dupesRemoved = filtered.length - recipients.length;
  if (dupesRemoved > 0) {
    result.skipped += dupesRemoved;
    result.skippedReasons['duplicate'] = dupesRemoved;
  }

  result.total = recipients.length;

  const usePauses = shouldUsePausePhases(recipients.length);
  console.log(
    `[promo ${promo.id}] envío iniciado. ${recipients.length} destinatarios ` +
      `(${result.skipped} filtrados). Patrón aleatorio (burst/normal/pause).`
  );

  // Recorremos la lista en "fases" aleatorias en lugar de batches fijos.
  let idx = 0;
  while (idx < recipients.length) {
    const phase = nextPhase();

    // Si es pausa larga y la lista es chica, saltarla
    if (phase.type === 'pause') {
      if (!usePauses) continue;
      console.log(`[promo ${promo.id}] PAUSA larga ${Math.round(phase.pauseMs / 1000)}s`);
      await sleep(phase.pauseMs);
      continue;
    }

    const phaseLabel = phase.type === 'burst' ? 'BURST' : 'NORMAL';
    const phaseCount = Math.min(phase.count, recipients.length - idx);
    console.log(`[promo ${promo.id}] fase ${phaseLabel} (${phaseCount} mensajes)`);

    for (let n = 0; n < phaseCount; n++) {
      const client = recipients[idx];
      idx++;

      try {
        if (promo.imageUrl) {
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

        await prisma.$transaction(async (tx) => {
          await tx.promotionSend.create({
            data: { promotionId: promo.id, clientId: client.id, status: 'sent' },
          });
          if (client.bounceCount > 0) {
            await tx.client.update({
              where: { id: client.id },
              data: { bounceCount: 0, lastBounceAt: null },
            });
          }
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
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        result.failed++;
        result.errors.push({ phone: client.phone, error: msg });

        await prisma.client.update({
          where: { id: client.id },
          data: {
            bounceCount: { increment: 1 },
            lastBounceAt: new Date(),
            ...(client.bounceCount + 1 >= 3
              ? { optedOut: true, optedOutReason: 'bounced', optedOutAt: new Date() }
              : {}),
          },
        });
        await prisma.promotionSend.create({
          data: {
            promotionId: promo.id,
            clientId: client.id,
            status: 'failed',
            error: msg,
          },
        });
      }

      // Delay aleatorio dentro de la fase (excepto en el último de la lista)
      if (idx < recipients.length) {
        const delay = phase.delayMs();
        await sleep(delay);
      }
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
