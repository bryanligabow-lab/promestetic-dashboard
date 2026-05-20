import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.integrationSettings.upsert({
    where: { id: 'singleton' },
    update: {
      evolutionApiUrl: 'https://contabilidad-mateai-evolution-api.dtuoap.easypanel.host',
      evolutionApiKey: '429683C4C977415CAAFCCE10F7D57E11',
      evolutionInstance: 'matea-contabilidad',
      publicBaseUrl: 'https://biblical-pam-went-acres.trycloudflare.com',
      claudeModel: 'claude-sonnet-4-6',
    },
    create: {
      id: 'singleton',
      evolutionApiUrl: 'https://contabilidad-mateai-evolution-api.dtuoap.easypanel.host',
      evolutionApiKey: '429683C4C977415CAAFCCE10F7D57E11',
      evolutionInstance: 'matea-contabilidad',
      publicBaseUrl: 'https://biblical-pam-went-acres.trycloudflare.com',
      claudeModel: 'claude-sonnet-4-6',
    },
  });
  console.log('✓ Integraciones precargadas en DB');
}
main().finally(() => prisma.$disconnect());
