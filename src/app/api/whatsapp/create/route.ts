import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { evolution, isEvolutionConfigured } from '@/lib/evolution';
import { getIntegrations } from '@/lib/settings';

export async function POST() {
  if (!(await isEvolutionConfigured())) {
    return NextResponse.json(
      { error: 'Evolution API no está configurada. Ve a Integraciones.' },
      { status: 400 }
    );
  }

  const integ = await getIntegrations();
  const webhookUrl = `${integ.publicBaseUrl}/api/webhook/evolution`;
  const name = await evolution.instance();

  try {
    await evolution.createInstance(webhookUrl);
  } catch {
    // ya existe → solo seteamos webhook
    try { await evolution.setWebhook(webhookUrl); } catch {}
  }

  const instance = await prisma.whatsAppInstance.upsert({
    where: { instanceName: name },
    update: { status: 'disconnected', lastSyncAt: new Date() },
    create: { instanceName: name, status: 'disconnected', lastSyncAt: new Date() },
  });

  return NextResponse.json(instance);
}
