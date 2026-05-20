'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ImageUpload } from '@/components/ImageUpload';
import { Plus, Trash2, Pencil, Send, Calendar, Clock, Repeat } from 'lucide-react';

interface Promo {
  id: string;
  title: string;
  message: string;
  imageUrl?: string;
  active: boolean;
  scheduledAt?: string;
  cronExpr?: string;
  autoSendOnCreate: boolean;
  targetTags: string;
  lastSentAt?: string;
  sendCount: number;
}

export function PromotionsClient({ initial }: { initial: Promo[] }) {
  const [promos, setPromos] = useState<Promo[]>(initial);
  const [editing, setEditing] = useState<Promo | null>(null);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  function startNew() {
    setEditing({
      id: '', title: '', message: '', imageUrl: '', active: true,
      scheduledAt: undefined, cronExpr: undefined,
      autoSendOnCreate: false, targetTags: '[]',
      sendCount: 0,
    });
    setCreating(true);
  }

  async function save(p: Promo) {
    const method = creating ? 'POST' : 'PUT';
    const url = creating ? '/api/promotions' : `/api/promotions/${p.id}`;
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p),
    });
    if (!res.ok) { toast.error(await res.text()); return; }
    const data = await res.json();
    toast.success(creating ? 'Promoción creada' : 'Guardada');

    // Si autoSend, ya se disparó en backend
    if (creating && p.autoSendOnCreate && data.sendResult) {
      toast.success(`Enviada a ${data.sendResult.sent} clientes`);
    }

    setEditing(null);
    setCreating(false);
    const fresh = await fetch('/api/promotions').then((r) => r.json());
    setPromos(fresh);
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar promoción?')) return;
    const res = await fetch(`/api/promotions/${id}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('Error'); return; }
    setPromos((s) => s.filter((p) => p.id !== id));
    toast.success('Eliminada');
  }

  async function sendNow(id: string) {
    if (
      !confirm(
        '¿Iniciar el envío de esta promoción?\n\n' +
          'El envío usa un patrón aleatorio antispam (ráfagas + pausas) para evitar baneos. ' +
          'En listas grandes puede tardar horas. Puedes cerrar el dashboard, el envío continúa en el servidor.'
      )
    )
      return;
    setSending(id);
    try {
      const res = await fetch(`/api/promotions/${id}/send`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      toast.success(
        data.message ?? 'Envío iniciado. Se actualizará el contador conforme avance.'
      );
      // Refrescar listado cada 10s mientras se está enviando
      const fresh = await fetch('/api/promotions').then((r) => r.json());
      setPromos(fresh);
    } catch (e) {
      toast.error('Error: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSending(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={startNew}>
          <Plus className="w-4 h-4" /> Nueva promoción
        </Button>
      </div>

      {editing && (
        <Card>
          <CardHeader>
            <CardTitle>{creating ? 'Nueva promoción' : 'Editar promoción'}</CardTitle>
            <CardDescription>
              Puedes enviarla manualmente, programarla para una fecha/hora o configurar un cron para que se repita.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Título (interno)</Label>
              <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Mensaje (lo que recibe el cliente)</Label>
              <Textarea
                rows={6}
                value={editing.message}
                onChange={(e) => setEditing({ ...editing, message: e.target.value })}
                placeholder="🎉 ¡Promoción especial!&#10;&#10;..."
              />
              <p className="text-xs text-muted-foreground">
                Puedes usar emojis y saltos de línea. Si añades imagen, este texto va como caption.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Imagen (opcional)</Label>
              <ImageUpload
                value={editing.imageUrl}
                onChange={(url) => setEditing({ ...editing, imageUrl: url })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tags objetivo (opcional, separados por coma)</Label>
              <Input
                value={JSON.parse(editing.targetTags || '[]').join(', ')}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    targetTags: JSON.stringify(
                      e.target.value.split(',').map((t) => t.trim()).filter(Boolean)
                    ),
                  })
                }
                placeholder="vip, recurrente"
              />
              <p className="text-xs text-muted-foreground">
                Si lo dejas vacío se envía a todos los clientes activos.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Programar para fecha/hora
                </Label>
                <Input
                  type="datetime-local"
                  value={editing.scheduledAt ? editing.scheduledAt.slice(0, 16) : ''}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Repeat className="w-4 h-4" /> Cron (repetir)
                </Label>
                <Input
                  value={editing.cronExpr ?? ''}
                  onChange={(e) =>
                    setEditing({ ...editing, cronExpr: e.target.value || undefined })
                  }
                  placeholder="0 10 * * 1 (lunes 10:00)"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Switch
                checked={editing.autoSendOnCreate}
                onCheckedChange={(c) => setEditing({ ...editing, autoSendOnCreate: c })}
                disabled={!creating}
              />
              <Label>Enviar inmediatamente al crearla</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={editing.active}
                onCheckedChange={(c) => setEditing({ ...editing, active: c })}
              />
              <Label>Activa</Label>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setEditing(null); setCreating(false); }}>
                Cancelar
              </Button>
              <Button onClick={() => save(editing)}>Guardar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {promos.length === 0 && (
          <p className="text-muted-foreground text-center py-8">
            No hay promociones aún.
          </p>
        )}
        {promos.map((p) => (
          <Card key={p.id}>
            <CardContent className="p-4 flex gap-4">
              {p.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageUrl} alt="" className="w-24 h-24 object-cover rounded-md" />
              )}
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{p.title}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{p.message}</p>
                  </div>
                  <div className="flex gap-1">
                    {p.active ? <Badge variant="success">Activa</Badge> : <Badge variant="outline">Pausada</Badge>}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-3 text-xs text-muted-foreground">
                  {p.scheduledAt && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(p.scheduledAt).toLocaleString('es-CO')}
                    </span>
                  )}
                  {p.cronExpr && (
                    <span className="flex items-center gap-1">
                      <Repeat className="w-3 h-3" /> {p.cronExpr}
                    </span>
                  )}
                  {p.lastSentAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Último envío: {new Date(p.lastSentAt).toLocaleString('es-CO')}
                    </span>
                  )}
                  <span>Total enviados: {p.sendCount}</span>
                </div>

                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={() => sendNow(p.id)}
                    disabled={sending === p.id || !p.active}
                  >
                    <Send className="w-3 h-3" />
                    {sending === p.id ? 'Enviando...' : 'Enviar ahora'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditing(p); setCreating(false); }}>
                    <Pencil className="w-3 h-3" /> Editar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(p.id)}>
                    <Trash2 className="w-3 h-3" /> Eliminar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
