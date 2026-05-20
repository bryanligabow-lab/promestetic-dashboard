import { prisma } from '@/lib/prisma';
import { ClientsClient } from './ClientsClient';

export const dynamic = 'force-dynamic';

export default async function ClientesPage() {
  const clients = await prisma.client.findMany({ orderBy: { createdAt: 'desc' } });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
        <p className="text-muted-foreground">
          Base de datos de clientes. Se llena automáticamente cuando alguien escribe por WhatsApp.
        </p>
      </div>
      <ClientsClient
        initial={clients.map((c) => ({
          ...c,
          name: c.name ?? '',
          email: c.email ?? '',
          notes: c.notes ?? '',
          lastSeenAt: c.lastSeenAt ? c.lastSeenAt.toISOString() : undefined,
        }))}
      />
    </div>
  );
}
