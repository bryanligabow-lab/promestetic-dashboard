import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** Devuelve una conversación con todos sus mensajes. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const conv = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!conv) return NextResponse.json({ error: 'no encontrada' }, { status: 404 });
  return NextResponse.json(conv);
}

/** PATCH para pausar bot, marcar/resolver ayuda. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (typeof body.paused === 'boolean') data.paused = body.paused;

  if (typeof body.needsHumanHelp === 'boolean') {
    data.needsHumanHelp = body.needsHumanHelp;
    data.helpRequestedAt = body.needsHumanHelp ? new Date() : null;
    data.helpReason = body.needsHumanHelp ? (body.helpReason ?? 'manual') : null;
  }

  const conv = await prisma.conversation.update({
    where: { id: params.id },
    data,
  });
  return NextResponse.json(conv);
}
