import { NextRequest, NextResponse } from 'next/server';
import { sheetsDb } from '@/lib/sheets-db';

/** Devuelve una conversación con todos sus mensajes. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const conv = await sheetsDb.conversation.findUnique({ where: { id: params.id } });
  if (!conv) return NextResponse.json({ error: 'no encontrada' }, { status: 404 });

  const [client, allMessages] = await Promise.all([
    conv.clientId
      ? sheetsDb.client.findUnique({ where: { id: conv.clientId } })
      : Promise.resolve(null),
    sheetsDb.message.findMany({ conversationId: conv.id }),
  ]);
  allMessages.sort((a: any, b: any) => (a.createdAt || '').localeCompare(b.createdAt || ''));

  return NextResponse.json({ ...conv, client, messages: allMessages });
}

/** PATCH para pausar bot, marcar/resolver ayuda. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (typeof body.paused === 'boolean') data.paused = body.paused;

  if (typeof body.needsHumanHelp === 'boolean') {
    data.needsHumanHelp = body.needsHumanHelp;
    data.helpRequestedAt = body.needsHumanHelp ? new Date().toISOString() : null;
    data.helpReason = body.needsHumanHelp ? (body.helpReason ?? 'manual') : null;
  }

  const conv = await sheetsDb.conversation.update({
    where: { id: params.id },
    data,
  });
  return NextResponse.json(conv);
}
