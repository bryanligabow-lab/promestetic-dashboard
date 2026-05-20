import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeTags } from '@/lib/tags';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  try {
    const item = await prisma.catalogItem.update({
      where: { id: params.id },
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
    console.error('[catalog.PUT]', err);
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.catalogItem.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[catalog.DELETE]', err);
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}
