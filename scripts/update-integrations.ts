import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const existing = await prisma.integrationSettings.findFirst();
  const data = {
    evolutionApiUrl: 'https://contabilidad-mateai-evolution-api-prom.dtuoap.easypanel.host',
    evolutionApiKey: '429683C4C977415CAAFCCE10F7D57E11',
    evolutionInstance: 'Promestetic',
  };
  if (existing) {
    await prisma.integrationSettings.update({ where: { id: existing.id }, data });
  } else {
    await prisma.integrationSettings.create({ data });
  }
  console.log('OK');
}
main().finally(() => prisma.$disconnect());
