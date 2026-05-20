export const dynamic = 'force-dynamic';

import { sheetsDb as prisma } from '@/lib/sheets-db';
import { getIntegrations } from '@/lib/settings';
import { WhatsAppClient } from './WhatsAppClient';

export default async function WhatsAppPage() {
  const [instance, integ] = await Promise.all([
    prisma.whatsAppInstance.findFirst(),
    getIntegrations(),
  ]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Conexión WhatsApp</h1>
        <p className="text-muted-foreground">
          Crea la instancia, genera el QR y escanéalo. Las credenciales se manejan en{' '}
          <a href="/dashboard/integraciones" className="underline">Integraciones</a>.
        </p>
      </div>
      <WhatsAppClient
        initial={instance ? {
          ...instance,
          phoneNumber: instance.phoneNumber ?? undefined,
          qrCodeData: instance.qrCodeData ?? undefined,
          lastSyncAt: instance.lastSyncAt ? instance.lastSyncAt.toISOString() : undefined,
        } : null}
        baseUrl={integ.publicBaseUrl}
        evolutionUrl={integ.evolutionApiUrl}
        instanceName={integ.evolutionInstance}
      />
    </div>
  );
}
