import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizePhone } from '@/lib/utils';
import { normalizeTags } from '@/lib/tags';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  try {
    const client = await prisma.client.update({
      where: { id: params.id },
      data: {
        phone: normalizePhone(body.phone),
        name: body.name || null,
        email: body.email || null,
        tags: normalizeTags(body.tags),
        notes: body.notes || null,
        optedOut: Boolean(body.optedOut),
      },
    });
    return NextResponse.json(client);
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'Este teléfono ya está registrado' }, { status: 409 });
    }
    console.error('[clients.PUT]', err);
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.client.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[clients.DELETE]', err);
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}
