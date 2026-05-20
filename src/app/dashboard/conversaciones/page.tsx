import { ConversationsClient } from './ConversationsClient';

export const dynamic = 'force-dynamic';

export default function ConversacionesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Conversaciones</h1>
        <p className="text-muted-foreground">
          Historial de WhatsApp. Recibe alertas con sonido cuando un cliente pida un asesor.
        </p>
      </div>
      <ConversationsClient />
    </div>
  );
}
