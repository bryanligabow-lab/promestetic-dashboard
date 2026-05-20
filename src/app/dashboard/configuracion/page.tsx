export const dynamic = 'force-dynamic';

import { sheetsDb as prisma } from '@/lib/sheets-db';
import { CompanyForm } from './CompanyForm';

export default async function ConfiguracionPage() {
  const company = await prisma.company.findFirst();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Empresa</h1>
        <p className="text-muted-foreground">
          Información básica, horarios y logo. Esta info se inyecta automáticamente en el contexto del chatbot.
        </p>
      </div>
      <CompanyForm initial={company ? {
        ...company,
        logoUrl: company.logoUrl ?? undefined,
        phone: company.phone ?? undefined,
        email: company.email ?? undefined,
        address: company.address ?? undefined,
        website: company.website ?? undefined,
        description: company.description ?? undefined,
      } : null} />
    </div>
  );
}
