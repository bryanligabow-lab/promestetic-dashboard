import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getIntegrations, maskKey } from '@/lib/settings';

export async function GET() {
  const integ = await getIntegrations();
  // No devolvemos las API keys completas, solo enmascaradas
  return NextResponse.json({
    anthropicApiKeyMasked: maskKey(integ.anthropicApiKey),
    anthropicConfigured: Boolean(integ.anthropicApiKey),
    sourceAnthropic: integ.sourceAnthropic,
    claudeModel: integ.claudeModel,

    evolutionApiUrl: integ.evolutionApiUrl,
    evolutionApiKeyMasked: maskKey(integ.evolutionApiKey),
    evolutionConfigured: Boolean(integ.evolutionApiUrl && integ.evolutionApiKey),
    sourceEvolution: integ.sourceEvolution,
    evolutionInstance: integ.evolutionInstance,

    publicBaseUrl: integ.publicBaseUrl,
    webhookUrl: `${integ.publicBaseUrl}/api/webhook/evolution`,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  // Solo escribimos los campos provistos (string vacío = limpiar; undefined = no tocar)
  const data: Record<string, string | null> = {};
  for (const key of [
    'anthropicApiKey',
    'claudeModel',
    'evolutionApiUrl',
    'evolutionApiKey',
    'evolutionInstance',
    'publicBaseUrl',
  ]) {
    if (key in body) {
      const v = body[key];
      data[key] = typeof v === 'string' && v.trim().length > 0 ? v.trim() : null;
    }
  }

  await prisma.integrationSettings.upsert({
    where: { id: 'singleton' },
    update: data,
    create: { id: 'singleton', ...data },
  });

  return NextResponse.json({ ok: true });
}
