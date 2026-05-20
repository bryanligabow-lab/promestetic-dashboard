import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { evolution, isEvolutionConfigured } from '@/lib/evolution';

export async function POST() {
  if (!(await isEvolutionConfigured())) {
    return NextResponse.json({ error: 'Evolution API no configurada' }, { status: 400 });
  }
  try {
    const data = await evolution.connect();
    const qr = data.base64 || data.code || '';
    const name = await evolution.instance();
    const instance = await prisma.whatsAppInstance.upsert({
      where: { instanceName: name },
      update: { status: 'qr_pending', qrCodeData: qr, lastSyncAt: new Date() },
      create: {
        instanceName: name,
        status: 'qr_pending',
        qrCodeData: qr,
        lastSyncAt: new Date(),
      },
    });
    return NextResponse.json({ qrCodeData: qr, instance });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
