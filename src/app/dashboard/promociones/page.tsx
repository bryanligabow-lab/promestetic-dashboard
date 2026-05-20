export const dynamic = 'force-dynamic';

import { sheetsDb as prisma } from '@/lib/sheets-db';
import { PromotionsClient } from './PromotionsClient';

export default async function PromocionesPage() {
  const promos = await prisma.promotion.findMany({ orderBy: { createdAt: 'desc' } });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Promociones</h1>
        <p className="text-muted-foreground">
          Crea, programa y envía promociones a WhatsApp con un botón.
        </p>
      </div>
      <PromotionsClient
        initial={promos.map((p) => ({
          ...p,
          imageUrl: p.imageUrl ?? undefined,
          cronExpr: p.cronExpr ?? undefined,
          scheduledAt: p.scheduledAt ? p.scheduledAt.toISOString() : undefined,
          lastSentAt: p.lastSentAt ? p.lastSentAt.toISOString() : undefined,
        }))}
      />
    </div>
  );
}
