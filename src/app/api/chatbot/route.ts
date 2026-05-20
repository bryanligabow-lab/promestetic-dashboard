import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const cfg = await prisma.chatbotConfig.findFirst();
  return NextResponse.json(cfg);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const company = await prisma.company.findFirst();
  if (!company) return NextResponse.json({ error: 'Configura la empresa primero' }, { status: 400 });

  const data = {
    companyId: company.id,
    systemPrompt: body.systemPrompt,
    userPromptTpl: body.userPromptTpl || '{message}',
    model: body.model || 'claude-sonnet-4-6',
    temperature: typeof body.temperature === 'number' ? body.temperature : 0.5,
    maxTokens: typeof body.maxTokens === 'number' ? body.maxTokens : 1024,
    rules: body.rules || '[]',
    welcomeMessage: body.welcomeMessage || null,
    offHoursMessage: body.offHoursMessage || null,
    respectHours: Boolean(body.respectHours),
    enabled: Boolean(body.enabled),
  };

  const existing = await prisma.chatbotConfig.findFirst();
  const cfg = existing
    ? await prisma.chatbotConfig.update({ where: { id: existing.id }, data })
    : await prisma.chatbotConfig.create({ data });
  return NextResponse.json(cfg);
}
