import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** Lista conversaciones para el panel (con cliente + último mensaje). */
export async function GET() {
  const conversations = await prisma.conversation.findMany({
    orderBy: [{ needsHumanHelp: 'desc' }, { lastMsgAt: 'desc' }],
    include: {
      client: true,
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });
  return NextResponse.json(conversations);
}
