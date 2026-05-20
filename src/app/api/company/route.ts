import { NextRequest, NextResponse } from 'next/server';
import { sheetsDb } from '@/lib/sheets-db';

export async function GET() {
  const c = await sheetsDb.company.findFirst();
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

  // upsert singleton (Apps Script tiene la action 'upsert' nativa)
  const company = await sheetsDb.company.upsert({
    where: {},
    create: data,
    update: data,
  });
  return NextResponse.json(company);
}
