import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const item = await prisma.catalogItem.update({
    where: { id: params.id },
    data: {
      type: body.type,
      name: body.name,
      description: body.description || '',
      price: body.price ?? null,
      imageUrl: body.imageUrl || null,
      tags: body.tags || '[]',
      active: body.active ?? true,
    },
  });
  return NextResponse.json(item);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.catalogItem.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
