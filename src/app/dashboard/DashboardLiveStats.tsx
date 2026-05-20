'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users, MessageSquare, Send, Megaphone, HandHelping, Activity,
  ArrowDownLeft, ArrowUpRight,
} from 'lucide-react';

interface Stats {
  clients: { total: number; newToday: number };
  messages: { inToday: number; outToday: number; totalToday: number; inLast7d: number; outLast7d: number };
  conversations: { active24h: number; needsHelp: number };
  promotions: { running: number; active: number };
  series: { date: string; in: number; out: number }[];
}

const POLL_MS = 10_000;

export function DashboardLiveStats() {
  const [s, setS] = useState<Stats | null>(null);

  async function load() {
    const r = await fetch('/api/dashboard/stats', { cache: 'no-store' });
    if (r.ok) setS(await r.json());
  }

  useEffect(() => {
    void load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, []);

  if (!s) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground text-sm">
          Cargando métricas...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Alertas */}
      {(s.conversations.needsHelp > 0 || s.promotions.running > 0) && (
        <div className="flex flex-wrap gap-2">
          {s.conversations.needsHelp > 0 && (
            <Link href="/dashboard/conversaciones">
              <Badge variant="destructive" className="cursor-pointer">
                <HandHelping className="w-3 h-3" />
                {s.conversations.needsHelp} {s.conversations.needsHelp === 1 ? 'pide asesor' : 'piden asesor'}
              </Badge>
            </Link>
          )}
          {s.promotions.running > 0 && (
            <Link href="/dashboard/envios">
              <Badge className="cursor-pointer">
                <Activity className="w-3 h-3 animate-pulse" />
                {s.promotions.running} {s.promotions.running === 1 ? 'promoción enviándose' : 'promociones enviándose'}
              </Badge>
            </Link>
          )}
        </div>
      )}

      {/* Métricas del día */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Mensajes hoy"
          value={s.messages.totalToday}
          sub={
            <span className="text-xs">
              <ArrowDownLeft className="inline w-3 h-3 text-emerald-500" /> {s.messages.inToday} recibidos ·
              <ArrowUpRight className="inline w-3 h-3 text-blue-500 ml-1" /> {s.messages.outToday} enviados
            </span>
          }
          icon={<MessageSquare className="w-5 h-5 text-primary" />}
          href="/dashboard/conversaciones"
        />
        <MetricCard
          label="Clientes nuevos hoy"
          value={s.clients.newToday}
          sub={<span className="text-xs">Total: {s.clients.total}</span>}
          icon={<Users className="w-5 h-5 text-primary" />}
          href="/dashboard/clientes"
        />
        <MetricCard
          label="Conversaciones activas (24h)"
          value={s.conversations.active24h}
          icon={<MessageSquare className="w-5 h-5 text-primary" />}
          href="/dashboard/conversaciones"
        />
        <MetricCard
          label="Promos activas"
          value={s.promotions.active}
          sub={
            s.promotions.running > 0 ? (
              <span className="text-xs text-blue-600">{s.promotions.running} enviándose</span>
            ) : undefined
          }
          icon={<Megaphone className="w-5 h-5 text-primary" />}
          href="/dashboard/promociones"
        />
      </div>

      {/* Gráfica simple últimos 7 días */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-sm">Mensajes últimos 7 días</h3>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-emerald-500 rounded-sm"></span>
                Recibidos ({s.messages.inLast7d})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-blue-500 rounded-sm"></span>
                Enviados ({s.messages.outLast7d})
              </span>
            </div>
          </div>
          <Sparkline series={s.series} />
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  label, value, sub, icon, href,
}: {
  label: string; value: number; sub?: React.ReactNode; icon: React.ReactNode; href: string;
}) {
  return (
    <Link href={href}>
      <Card className="hover:shadow-md transition cursor-pointer h-full">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            {icon}
          </div>
          <p className="text-2xl font-bold">{value}</p>
          {sub && <div className="mt-1 text-muted-foreground">{sub}</div>}
        </CardContent>
      </Card>
    </Link>
  );
}

function Sparkline({ series }: { series: { date: string; in: number; out: number }[] }) {
  const max = Math.max(1, ...series.map((d) => d.in + d.out));
  return (
    <div className="flex items-end gap-3 h-32">
      {series.map((d) => {
        const inH = (d.in / max) * 100;
        const outH = (d.out / max) * 100;
        const dayLabel = new Date(d.date + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'short' });
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex gap-0.5 h-full items-end">
              <div
                className="flex-1 bg-emerald-500 rounded-t min-h-[1px]"
                style={{ height: `${inH}%` }}
                title={`${d.in} recibidos`}
              />
              <div
                className="flex-1 bg-blue-500 rounded-t min-h-[1px]"
                style={{ height: `${outH}%` }}
                title={`${d.out} enviados`}
              />
            </div>
            <span className="text-[10px] text-muted-foreground capitalize">{dayLabel}</span>
          </div>
        );
      })}
    </div>
  );
}
