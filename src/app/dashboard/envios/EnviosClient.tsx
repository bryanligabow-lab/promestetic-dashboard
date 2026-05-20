'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Clock, Loader2, RefreshCw, Send } from 'lucide-react';
import { formatPhone } from '@/lib/utils';
import { toast } from 'sonner';

interface Promotion {
  id: string;
  title: string;
  message: string;
  imageUrl: string | null;
  active: boolean;
  status: 'idle' | 'running' | 'completed' | 'failed';
  totalToSend: number;
  sendCount: number;
  startedAt: string | null;
  finishedAt: string | null;
  lastSentAt: string | null;
}

interface ProgressData {
  promotion: any;
  progress: {
    sent: number;
    failed: number;
    pending: number;
    total: number;
    pct: number;
    msgsPerMin: number;
    etaMin: number | null;
  };
  recent: Array<{
    id: string;
    phone: string;
    name: string | null;
    status: string;
    error: string | null;
    sentAt: string;
  }>;
  upcoming: Array<{ id: string; phone: string; name: string | null }>;
}

const POLL_MS = 5000;

export function EnviosClient() {
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadPromos() {
    const res = await fetch('/api/promotions', { cache: 'no-store' });
    if (!res.ok) return;
    const data: Promotion[] = await res.json();
    // ordenar: running primero, luego más reciente
    data.sort((a, b) => {
      if (a.status === 'running' && b.status !== 'running') return -1;
      if (b.status === 'running' && a.status !== 'running') return 1;
      const at = a.lastSentAt ?? a.startedAt ?? '';
      const bt = b.lastSentAt ?? b.startedAt ?? '';
      return bt.localeCompare(at);
    });
    setPromos(data);
    setLoading(false);
    if (!selectedId && data.length) setSelectedId(data[0].id);
  }

  async function loadProgress(id: string) {
    const res = await fetch(`/api/promotions/${id}/progress`, { cache: 'no-store' });
    if (res.ok) setProgress(await res.json());
  }

  useEffect(() => {
    void loadPromos();
    const t = setInterval(loadPromos, POLL_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    void loadProgress(selectedId);
    const t = setInterval(() => loadProgress(selectedId), POLL_MS);
    return () => clearInterval(t);
  }, [selectedId]);

  async function sendNow(id: string) {
    if (!confirm('¿Enviar esta promoción ahora a todos los clientes que cumplen?')) return;
    const res = await fetch(`/api/promotions/${id}/send`, { method: 'POST' });
    const json = await res.json();
    if (res.ok) {
      toast.success('Envío iniciado en segundo plano');
      void loadPromos();
    } else {
      toast.error(json.error ?? 'Error al iniciar envío');
    }
  }

  const runningCount = useMemo(() => promos.filter((p) => p.status === 'running').length, [promos]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-card border rounded-lg p-3">
        <div className="flex items-center gap-3">
          <Badge variant={runningCount > 0 ? 'default' : 'outline'}>
            {runningCount} en curso
          </Badge>
          <Badge variant="outline">{promos.length} promociones</Badge>
        </div>
        <Button size="sm" variant="outline" onClick={() => loadPromos()}>
          <RefreshCw className="w-3 h-3" /> Refrescar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Lista de promos */}
        <Card className="lg:col-span-1 max-h-[80vh] overflow-y-auto">
          <CardContent className="p-0">
            {loading && (
              <p className="p-6 text-center text-muted-foreground text-sm">Cargando...</p>
            )}
            {!loading && promos.length === 0 && (
              <p className="p-6 text-center text-muted-foreground text-sm">Sin promociones.</p>
            )}
            {promos.map((p) => {
              const isSel = p.id === selectedId;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={`w-full text-left p-4 border-b transition-colors ${
                    isSel ? 'bg-accent' : 'hover:bg-accent/50'
                  } ${p.status === 'running' ? 'border-l-4 border-l-blue-500' : ''}`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-medium text-sm truncate">{p.title}</p>
                    <StatusBadge status={p.status} />
                  </div>
                  {p.status === 'running' && p.totalToSend > 0 && (
                    <div className="mt-2">
                      <div className="h-2 bg-muted rounded overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all"
                          style={{
                            width: `${Math.round((p.sendCount / p.totalToSend) * 100)}%`,
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {p.sendCount} / {p.totalToSend}
                      </p>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {p.lastSentAt
                      ? `Último: ${new Date(p.lastSentAt).toLocaleString('es-CO')}`
                      : 'Sin envíos aún'}
                  </p>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Detalle */}
        <div className="lg:col-span-2 space-y-4">
          {progress ? (
            <>
              {/* Header */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h2 className="font-semibold">{progress.promotion.title}</h2>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {progress.promotion.message}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <StatusBadge status={progress.promotion.status} />
                      {progress.promotion.status !== 'running' && (
                        <Button size="sm" onClick={() => sendNow(progress.promotion.id)}>
                          <Send className="w-3 h-3" /> Enviar ahora
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <StatCard label="Enviados" value={progress.progress.sent} icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />} />
                <StatCard label="Fallidos" value={progress.progress.failed} icon={<XCircle className="w-4 h-4 text-red-500" />} />
                <StatCard label="Pendientes" value={progress.progress.pending} icon={<Clock className="w-4 h-4 text-amber-500" />} />
                <StatCard label="Velocidad" value={`${progress.progress.msgsPerMin}/min`} />
                <StatCard
                  label="ETA"
                  value={
                    progress.progress.etaMin == null
                      ? '—'
                      : progress.progress.etaMin < 60
                        ? `${progress.progress.etaMin} min`
                        : `${Math.floor(progress.progress.etaMin / 60)}h ${progress.progress.etaMin % 60}m`
                  }
                />
              </div>

              {/* Barra de progreso */}
              {progress.progress.total > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span>{progress.progress.sent + progress.progress.failed} de {progress.progress.total}</span>
                      <span className="font-medium">{progress.progress.pct}%</span>
                    </div>
                    <div className="h-3 bg-muted rounded overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all"
                        style={{ width: `${progress.progress.pct}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tabla: últimos envíos */}
              <Card>
                <CardContent className="p-0">
                  <div className="p-4 border-b">
                    <h3 className="font-medium text-sm">Últimos envíos ({progress.recent.length})</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="text-left px-4 py-2">Cliente</th>
                          <th className="text-left px-4 py-2">Estado</th>
                          <th className="text-left px-4 py-2">Hora</th>
                        </tr>
                      </thead>
                      <tbody>
                        {progress.recent.length === 0 && (
                          <tr>
                            <td colSpan={3} className="text-center text-muted-foreground p-6">
                              Aún no hay envíos.
                            </td>
                          </tr>
                        )}
                        {progress.recent.map((r) => (
                          <tr key={r.id} className="border-t">
                            <td className="px-4 py-2">
                              <div className="font-medium">{r.name || formatPhone(r.phone)}</div>
                              {r.name && (
                                <div className="text-xs text-muted-foreground">{formatPhone(r.phone)}</div>
                              )}
                            </td>
                            <td className="px-4 py-2">
                              {r.status === 'sent' ? (
                                <Badge variant="success" className="text-[10px]">
                                  <CheckCircle2 className="w-3 h-3" /> enviado
                                </Badge>
                              ) : (
                                <div>
                                  <Badge variant="destructive" className="text-[10px]">
                                    <XCircle className="w-3 h-3" /> falló
                                  </Badge>
                                  {r.error && (
                                    <p className="text-[10px] text-red-600 mt-1">{r.error}</p>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-2 text-muted-foreground text-xs">
                              {new Date(r.sentAt).toLocaleString('es-CO')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Próximos */}
              {progress.upcoming.length > 0 && (
                <Card>
                  <CardContent className="p-0">
                    <div className="p-4 border-b flex items-center gap-2">
                      <h3 className="font-medium text-sm">Próximos a recibir</h3>
                      <Badge variant="outline" className="text-[10px]">
                        {progress.upcoming.length}+
                      </Badge>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      <table className="w-full text-sm">
                        <tbody>
                          {progress.upcoming.map((c) => (
                            <tr key={c.id} className="border-t">
                              <td className="px-4 py-2">
                                <div className="font-medium">{c.name || formatPhone(c.phone)}</div>
                                {c.name && (
                                  <div className="text-xs text-muted-foreground">{formatPhone(c.phone)}</div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="p-10 text-center text-muted-foreground">
                {selectedId ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'Selecciona una promoción.'}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: any; label: string }> = {
    running: { variant: 'default', label: '● enviando' },
    completed: { variant: 'success', label: '✓ completada' },
    failed: { variant: 'destructive', label: '✗ falló' },
    idle: { variant: 'outline', label: 'lista' },
  };
  const cfg = map[status] ?? map.idle;
  return (
    <Badge variant={cfg.variant} className="text-[10px] whitespace-nowrap">
      {cfg.label}
    </Badge>
  );
}

function StatCard({ label, value, icon }: { label: string; value: any; icon?: any }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{label}</p>
          {icon}
        </div>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}
