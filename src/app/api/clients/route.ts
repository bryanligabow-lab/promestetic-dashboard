import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizePhone } from '@/lib/utils';
import { normalizeTags } from '@/lib/tags';

export async function GET() {
  const clients = await prisma.client.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const phone = normalizePhone(body.phone);
  if (!phone) return NextResponse.json({ error: 'Teléfono inválido' }, { status: 400 });

  try {
    const client = await prisma.client.create({
      data: {
        phone,
        name: body.name || null,
        email: body.email || null,
        tags: normalizeTags(body.tags),
        notes: body.notes || null,
        optedOut: Boolean(body.optedOut),
      },
    });
    return NextResponse.json(client);
  } catch (err: any) {
    // P2002 = unique constraint (phone duplicado)
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'Este teléfono ya está registrado' }, { status: 409 });
    }
    console.error('[clients.POST]', err);
    return NextResponse.json({ error: 'Error al crear cliente' }, { status: 500 });
  }
}
