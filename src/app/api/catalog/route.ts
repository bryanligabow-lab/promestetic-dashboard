import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeTags } from '@/lib/tags';

export async function GET() {
  const items = await prisma.catalogItem.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name || !body.type) {
    return NextResponse.json({ error: 'name y type son obligatorios' }, { status: 400 });
  }
  try {
    const item = await prisma.catalogItem.create({
      data: {
        type: body.type,
        name: body.name,
        description: body.description || '',
        price: body.price ?? null,
        imageUrl: body.imageUrl || null,
        tags: normalizeTags(body.tags),
        active: body.active ?? true,
      },
    });
    return NextResponse.json(item);
  } catch (err) {
    console.error('[catalog.POST]', err);
    return NextResponse.json({ error: 'Error al crear item' }, { status: 500 });
  }
}
