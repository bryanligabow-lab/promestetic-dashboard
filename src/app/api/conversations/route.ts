export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { sheetsDb } from '@/lib/sheets-db';

/** Lista conversaciones para el panel (con cliente + último mensaje). */
export async function GET() {
  const [convs, clients, messages] = await Promise.all([
    sheetsDb.conversation.findMany(),
    sheetsDb.client.findMany(),
    sheetsDb.message.findMany(),
  ]);

  const clientById = new Map<string, any>(clients.map((c: any) => [c.id, c]));
  // último mensaje por conversación
  const lastMsgByConv = new Map<string, any>();
  for (const m of messages) {
    const prev = lastMsgByConv.get(m.conversationId);
    if (!prev || (m.createdAt || '') > (prev.createdAt || '')) {
      lastMsgByConv.set(m.conversationId, m);
    }
  }

  const out = convs.map((c: any) => ({
    ...c,
    client: clientById.get(c.clientId) ?? null,
    messages: lastMsgByConv.has(c.id) ? [lastMsgByConv.get(c.id)] : [],
  }));

  // orden: needsHumanHelp desc, lastMsgAt desc
  out.sort((a: any, b: any) => {
    if (a.needsHumanHelp !== b.needsHumanHelp) return a.needsHumanHelp ? -1 : 1;
    return (b.lastMsgAt || '').localeCompare(a.lastMsgAt || '');
  });

  return NextResponse.json(out);
}
