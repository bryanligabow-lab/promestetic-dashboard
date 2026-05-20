export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { sheetsDb } from '@/lib/sheets-db';

/** Lista compacta de conversaciones que requieren un asesor. */
export async function GET() {
  const convs = await sheetsDb.conversation.findMany({ needsHumanHelp: true });
  const clients = await sheetsDb.client.findMany();
  const byId = new Map<string, any>(clients.map((c: any) => [c.id, c]));

  const out = convs
    .map((c: any) => {
      const client = byId.get(c.clientId);
      return {
        id: c.id,
        clientName: client?.name ?? null,
        clientPhone: client?.phone ?? null,
        helpRequestedAt: c.helpRequestedAt,
        helpReason: c.helpReason,
      };
    })
    .sort((a, b) => (b.helpRequestedAt || '').localeCompare(a.helpRequestedAt || ''));

  return NextResponse.json(out);
}
