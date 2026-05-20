import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizePhone } from '@/lib/utils';

export async function GET() {
  const clients = await prisma.client.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const phone = normalizePhone(body.phone);
  if (!phone) return NextResponse.json({ error: 'Teléfono inválido' }, { status: 400 });

  const client = await prisma.client.create({
    data: {
      phone,
      name: body.name || null,
      email: body.email || null,
      tags: body.tags || '[]',
      notes: body.notes || null,
      optedOut: Boolean(body.optedOut),
    },
  });
  return NextResponse.json(client);
}
