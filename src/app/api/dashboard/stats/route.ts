import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { prisma } from '@/lib/prisma';

/**
 * Métricas para la página de inicio del dashboard.
 *
 * Incluye:
 *  - Total clientes (y nuevos hoy)
 *  - Mensajes recibidos / enviados (hoy y 7 días)
 *  - Conversaciones activas / que piden asesor
 *  - Promos en curso / activas
 *  - Serie diaria de los últimos 7 días para gráfica
 */
export async function GET() {
  noStore();

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOf7d = new Date(now);
  startOf7d.setDate(startOf7d.getDate() - 6);
  startOf7d.setHours(0, 0, 0, 0);

  const [
    totalClients,
    newClientsToday,
    msgsInToday,
    msgsOutToday,
    msgsInLast7d,
    msgsOutLast7d,
    activeConversations,
    needsHelp,
    runningPromos,
    activePromos,
    last7dMessages,
  ] = await Promise.all([
    prisma.client.count(),
    prisma.client.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.message.count({ where: { direction: 'in', createdAt: { gte: startOfToday } } }),
    prisma.message.count({ where: { direction: 'out', createdAt: { gte: startOfToday } } }),
    prisma.message.count({ where: { direction: 'in', createdAt: { gte: startOf7d } } }),
    prisma.message.count({ where: { direction: 'out', createdAt: { gte: startOf7d } } }),
    prisma.conversation.count({
      where: { lastMsgAt: { gte: new Date(now.getTime() - 24 * 3600_000) } },
    }),
    prisma.conversation.count({ where: { needsHumanHelp: true } }),
    prisma.promotion.count({ where: { status: 'running' } }),
    prisma.promotion.count({ where: { active: true } }),
    prisma.message.findMany({
      where: { createdAt: { gte: startOf7d } },
      select: { createdAt: true, direction: true },
    }),
  ]);

  // Serie diaria
  const byDay: Record<string, { date: string; in: number; out: number }> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOf7d);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    byDay[key] = { date: key, in: 0, out: 0 };
  }
  for (const m of last7dMessages) {
    const key = m.createdAt.toISOString().slice(0, 10);
    if (!byDay[key]) continue;
    if (m.direction === 'in') byDay[key].in++;
    else byDay[key].out++;
  }

  return NextResponse.json({
    clients: { total: totalClients, newToday: newClientsToday },
    messages: {
      inToday: msgsInToday,
      outToday: msgsOutToday,
      totalToday: msgsInToday + msgsOutToday,
      inLast7d: msgsInLast7d,
      outLast7d: msgsOutLast7d,
    },
    conversations: { active24h: activeConversations, needsHelp },
    promotions: { running: runningPromos, active: activePromos },
    series: Object.values(byDay),
  });
}
