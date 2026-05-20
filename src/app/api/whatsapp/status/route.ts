export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { sheetsDb as prisma } from '@/lib/sheets-db';
import { evolution, isEvolutionConfigured } from '@/lib/evolution';

export async function GET() {
  let instance = await prisma.whatsAppInstance.findFirst();

  if (await isEvolutionConfigured()) {
    try {
      const state = await evolution.connectionState();
      const remote = state.instance?.state ?? 'unknown';
      const status =
        remote === 'open' ? 'connected' :
        remote === 'connecting' ? 'qr_pending' : 'disconnected';

      if (instance) {
        instance = await prisma.whatsAppInstance.update({
          where: { id: instance.id },
          data: { status, lastSyncAt: new Date() },
        });
      }
    } catch {
      // mostramos lo último de DB
    }
  }

  return NextResponse.json(instance);
}
