import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { prisma } from '@/lib/prisma';

/**
 * Devuelve el progreso de envío de una promoción.
 *
 * Calcula:
 *  - total esperado (totalToSend)
 *  - enviados / fallidos
 *  - pendientes (totalToSend - sent - failed)
 *  - throughput (msgs/min en los últimos 5 min)
 *  - ETA en minutos
 *  - últimos 50 envíos con cliente + timestamp
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  noStore();

  const promo = await prisma.promotion.findUnique({
    where: { id: params.id },
  });
  if (!promo) {
    return NextResponse.json({ error: 'Promoción no encontrada' }, { status: 404 });
  }

  const [sent, failed] = await Promise.all([
    prisma.promotionSend.count({ where: { promotionId: promo.id, status: 'sent' } }),
    prisma.promotionSend.count({ where: { promotionId: promo.id, status: 'failed' } }),
  ]);

  const done = sent + failed;
  const total = Math.max(promo.totalToSend, done);
  const pending = Math.max(0, total - done);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  // Throughput: cuántos sends en los últimos 5 minutos
  const fiveMinAgo = new Date(Date.now() - 5 * 60_000);
  const recentCount = await prisma.promotionSend.count({
    where: { promotionId: promo.id, sentAt: { gte: fiveMinAgo } },
  });
  const msgsPerMin = recentCount / 5;
  const etaMin = msgsPerMin > 0 ? Math.ceil(pending / msgsPerMin) : null;

  // Últimos envíos
  const recent = await prisma.promotionSend.findMany({
    where: { promotionId: promo.id },
    orderBy: { sentAt: 'desc' },
    take: 50,
    include: { client: { select: { phone: true, name: true } } },
  });

  // Próximos pendientes: clientes que cumplen el target pero aún no recibieron
  // (limitado a 20 para no pesar)
  const alreadySent = await prisma.promotionSend.findMany({
    where: { promotionId: promo.id },
    select: { clientId: true },
  });
  const sentIds = new Set(alreadySent.map((s) => s.clientId));

  const upcomingCandidates = await prisma.client.findMany({
    where: {
      optedOut: false,
      isSpam: false,
      bounceCount: { lt: 3 },
    },
    take: 200,
  });
  const upcoming = upcomingCandidates
    .filter((c) => !sentIds.has(c.id))
    .slice(0, 20)
    .map((c) => ({ id: c.id, phone: c.phone, name: c.name }));

  return NextResponse.json({
    promotion: {
      id: promo.id,
      title: promo.title,
      message: promo.message,
      imageUrl: promo.imageUrl,
      status: promo.status,
      startedAt: promo.startedAt,
      finishedAt: promo.finishedAt,
      lastSentAt: promo.lastSentAt,
      totalToSend: promo.totalToSend,
    },
    progress: {
      sent,
      failed,
      pending,
      total,
      pct,
      msgsPerMin: Math.round(msgsPerMin * 10) / 10,
      etaMin,
    },
    recent: recent.map((r) => ({
      id: r.id,
      phone: r.client.phone,
      name: r.client.name,
      status: r.status,
      error: r.error,
      sentAt: r.sentAt,
    })),
    upcoming,
  });
}
