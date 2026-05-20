import { NextRequest, NextResponse } from 'next/server';
import { sheetsDb } from '@/lib/sheets-db';
import { normalizePhone } from '@/lib/utils';

export async function GET() {
  const clients = await sheetsDb.client.findMany();
  // Ordenar desc por createdAt (Sheets no soporta orderBy nativo)
  clients.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const phone = normalizePhone(body.phone);
  if (!phone) return NextResponse.json({ error: 'Teléfono inválido' }, { status: 400 });

  const client = await sheetsDb.client.create({
    data: {
      phone,
      name: body.name || null,
      email: body.email || null,
      tags: body.tags || '[]',
      notes: body.notes || null,
      optedOut: Boolean(body.optedOut),
      bounceCount: 0,
      isSpam: false,
    },
  });
  return NextResponse.json(client);
}
