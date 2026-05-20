import { prisma } from '@/lib/prisma';
import { CatalogClient } from './CatalogClient';

export default async function CatalogoPage() {
  const items = await prisma.catalogItem.findMany({ orderBy: { createdAt: 'desc' } });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Catálogo</h1>
        <p className="text-muted-foreground">
          Productos, servicios e información de la empresa. Todo lo que esté <b>activo</b> se
          inyecta en el contexto del chatbot.
        </p>
      </div>
      <CatalogClient initial={items.map((i) => ({
        ...i,
        description: i.description ?? '',
        imageUrl: i.imageUrl ?? undefined,
        price: i.price ?? undefined,
      }))} />
    </div>
  );
}
