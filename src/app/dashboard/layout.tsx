import { Sidebar } from '@/components/Sidebar';
import { startScheduler } from '@/lib/scheduler';

// Inicializa el scheduler de promociones al arrancar el server
if (typeof window === 'undefined') {
  startScheduler();
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden">
        <div className="p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
