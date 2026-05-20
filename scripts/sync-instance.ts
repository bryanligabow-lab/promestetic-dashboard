import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const prisma = new PrismaClient();
async function main() {
  const qr = fs.readFileSync('/tmp/wa-qr.png').toString('base64');
  await prisma.whatsAppInstance.upsert({
    where: { instanceName: 'matea-contabilidad' },
    update: { status: 'qr_pending', qrCodeData: `data:image/png;base64,${qr}`, lastSyncAt: new Date() },
    create: { instanceName: 'matea-contabilidad', status: 'qr_pending', qrCodeData: `data:image/png;base64,${qr}`, lastSyncAt: new Date() },
  });
  console.log('Instancia sincronizada en DB local');
}
main().finally(() => prisma.$disconnect());
