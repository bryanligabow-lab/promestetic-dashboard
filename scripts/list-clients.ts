import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const cs = await prisma.client.findMany();
  cs.forEach(c => console.log(c.id, c.phone, c.name));
}
main().finally(() => prisma.$disconnect());
