import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const client = await prisma.client.findFirst();
  if (!client) { console.log('no client'); return; }
  const conv = await prisma.conversation.upsert({
    where: { clientId: client.id },
    update: { needsHumanHelp: true, helpRequestedAt: new Date(), helpReason: 'keyword: asesor' },
    create: { clientId: client.id, needsHumanHelp: true, helpRequestedAt: new Date(), helpReason: 'keyword: asesor' },
  });
  await prisma.message.create({
    data: {
      conversationId: conv.id, direction: 'in', sender: 'client',
      content: 'Quiero hablar con un asesor por favor, urgente',
    },
  });
  console.log('OK conv:', conv.id, 'client:', client.phone);
}
main().finally(() => prisma.$disconnect());
