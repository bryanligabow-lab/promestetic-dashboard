import { EnviosClient } from './EnviosClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function EnviosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Envíos</h1>
        <p className="text-muted-foreground">
          Progreso en vivo del envío de promociones. Se actualiza solo cada 5s.
        </p>
      </div>
      <EnviosClient />
    </div>
  );
}
