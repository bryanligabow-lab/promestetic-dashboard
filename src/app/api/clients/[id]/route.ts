import { NextRequest, NextResponse } from 'next/server';
import { sheetsDb } from '@/lib/sheets-db';
import { normalizePhone } from '@/lib/utils';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const client = await sheetsDb.client.update({
    where: { id: params.id },
    data: {
      phone: normalizePhone(body.phone),
      name: body.name || null,
      email: body.email || null,
      tags: body.tags || '[]',
      notes: body.notes || null,
      optedOut: Boolean(body.optedOut),
    },
  });
  return NextResponse.json(client);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await sheetsDb.client.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
