import { NextRequest, NextResponse } from 'next/server';
import { sheetsDb as prisma } from '@/lib/sheets-db';

export async function GET() {
  const items = await prisma.catalogItem.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const item = await prisma.catalogItem.create({
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
