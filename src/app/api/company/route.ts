import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const c = await prisma.company.findFirst();
  return NextResponse.json(c);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const data = {
    name: body.name,
    slug: body.slug,
    logoUrl: body.logoUrl || null,
    phone: body.phone || null,
    email: body.email || null,
    address: body.address || null,
    website: body.website || null,
    description: body.description || null,
    hours: body.hours || '{}',
    timezone: body.timezone || 'America/Bogota',
  };

  const existing = await prisma.company.findFirst();
  const company = existing
    ? await prisma.company.update({ where: { id: existing.id }, data })
    : await prisma.company.create({ data });
  return NextResponse.json(company);
}
