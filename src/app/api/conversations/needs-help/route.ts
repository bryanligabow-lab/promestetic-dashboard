import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Lista compacta de conversaciones que requieren un asesor.
 * Sirve para que el cliente polleé y dispare el sonido cuando aparezcan nuevas.
 */
export async function GET() {
  const convs = await prisma.conversation.findMany({
    where: { needsHumanHelp: true },
    include: { client: true },
    orderBy: { helpRequestedAt: 'desc' },
  });
  return NextResponse.json(
    convs.map((c) => ({
      id: c.id,
      clientName: c.client.name,
      clientPhone: c.client.phone,
      helpRequestedAt: c.helpRequestedAt,
      helpReason: c.helpReason,
    }))
  );
}
