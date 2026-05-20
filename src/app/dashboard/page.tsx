import Link from 'next/link';
import { unstable_noStore as noStore } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getIntegrations } from '@/lib/settings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Megaphone, MessageSquare, Bot, Smartphone } from 'lucide-react';
import { DashboardLiveStats } from './DashboardLiveStats';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getStats() {
  const [company, chatbot, clients, promos, messages, instance, integ] = await Promise.all([
    prisma.company.findFirst(),
    prisma.chatbotConfig.findFirst(),
    prisma.client.count(),
    prisma.promotion.count({ where: { active: true } }),
    prisma.message.count(),
    prisma.whatsAppInstance.findFirst(),
    getIntegrations(),
  ]);
  return { company, chatbot, clients, promos, messages, instance, integ };
}

export default async function DashboardHome() {
  noStore();
  const { company, chatbot, instance, integ } = await getStats();

  const checklist = [
    { ok: !!company?.name, label: 'Empresa configurada', href: '/dashboard/configuracion' },
    { ok: !!chatbot && chatbot.systemPrompt.length > 20, label: 'Prompt del chatbot listo', href: '/dashboard/chatbot' },
    { ok: !!integ.anthropicApiKey, label: 'Cerebro (Anthropic) conectado', href: '/dashboard/integraciones' },
    { ok: !!integ.evolutionApiUrl && !!integ.evolutionApiKey, label: 'Evolution API configurada', href: '/dashboard/integraciones' },
    { ok: instance?.status === 'connected', label: 'WhatsApp vinculado', href: '/dashboard/whatsapp' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Hola{company?.name ? `, ${company.name}` : ''} 👋
        </h1>
        <p className="text-muted-foreground">Resumen del estado de tu chatbot</p>
      </div>

      {/* Métricas en vivo (polling cada 10s) */}
      <DashboardLiveStats />

      <Card>
        <CardHeader>
          <CardTitle>Checklist de configuración</CardTitle>
          <CardDescription>Completa estos pasos para que el chatbot funcione</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {checklist.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center justify-between p-3 rounded-md hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                    item.ok ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground border'
                  }`}
                >
                  {item.ok ? '✓' : '·'}
                </div>
                <span className={item.ok ? 'text-foreground' : 'text-muted-foreground'}>
                  {item.label}
                </span>
              </div>
              {!item.ok && <Badge variant="outline">Pendiente</Badge>}
            </Link>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Bot className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">Estado del chatbot</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant={chatbot?.enabled ? 'success' : 'outline'}>
                {chatbot?.enabled ? 'Activo' : 'Inactivo'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Modelo: {chatbot?.model || 'no configurado'}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">WhatsApp</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Badge
              variant={instance?.status === 'connected' ? 'success' : 'warning'}
            >
              {instance?.status ?? 'sin conexión'}
            </Badge>
            {instance?.phoneNumber && (
              <p className="text-sm text-muted-foreground mt-2">
                Número: {instance.phoneNumber}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
