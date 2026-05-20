import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { evolution, isEvolutionConfigured } from '@/lib/evolution';

export async function POST() {
  if (await isEvolutionConfigured()) {
    try { await evolution.logout(); } catch {}
  }
  const inst = await prisma.whatsAppInstance.findFirst();
  if (inst) {
    await prisma.whatsAppInstance.update({
      where: { id: inst.id },
      data: { status: 'disconnected', qrCodeData: null, lastSyncAt: new Date() },
    });
  }
  return NextResponse.json({ ok: true });
}
