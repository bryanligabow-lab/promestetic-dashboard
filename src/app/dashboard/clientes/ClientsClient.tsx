'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { formatPhone, normalizePhone, parseJson } from '@/lib/utils';

interface Client {
  id: string;
  phone: string;
  name: string;
  email: string;
  tags: string;
  notes: string;
  optedOut: boolean;
  lastSeenAt?: string;
}

export function ClientsClient({ initial }: { initial: Client[] }) {
  const [clients, setClients] = useState<Client[]>(initial);
  const [editing, setEditing] = useState<Client | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = clients.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.phone.includes(q) || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
  });

  function startNew() {
    setEditing({
      id: '', phone: '', name: '', email: '',
      tags: '[]', notes: '', optedOut: false,
    });
    setCreating(true);
  }

  async function save(c: Client) {
    const payload = { ...c, phone: normalizePhone(c.phone) };
    const method = creating ? 'POST' : 'PUT';
    const url = creating ? '/api/clients' : `/api/clients/${c.id}`;
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) { toast.error(await res.text()); return; }
    toast.success('Guardado');
    setEditing(null);
    setCreating(false);
    const fresh = await fetch('/api/clients').then((r) => r.json());
    setClients(fresh);
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar cliente?')) return;
    const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('Error'); return; }
    setClients((s) => s.filter((c) => c.id !== id));
    toast.success('Eliminado');
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input
            placeholder="Buscar por teléfono, nombre, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={startNew}>
          <Plus className="w-4 h-4" /> Nuevo cliente
        </Button>
      </div>

      {editing && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Teléfono (con código país, sin +)</Label>
                <Input
                  value={editing.phone}
                  onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                  placeholder="573001234567"
                />
              </div>
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Tags (separados por coma)</Label>
                <Input
                  value={parseJson<string[]>(editing.tags, []).join(', ')}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      tags: JSON.stringify(
                        e.target.value.split(',').map((t) => t.trim()).filter(Boolean)
                      ),
                    })
                  }
                  placeholder="vip, recurrente"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Notas</Label>
                <Textarea
                  rows={2}
                  value={editing.notes}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={editing.optedOut}
                onCheckedChange={(c) => setEditing({ ...editing, optedOut: c })}
              />
              <Label>Excluir de promociones (opted-out)</Label>
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

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3 font-medium">Teléfono</th>
                <th className="p-3 font-medium">Nombre</th>
                <th className="p-3 font-medium">Tags</th>
                <th className="p-3 font-medium">Promos</th>
                <th className="p-3 font-medium">Último contacto</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    {clients.length === 0 ? 'Sin clientes aún.' : 'Sin resultados.'}
                  </td>
                </tr>
              )}
              {filtered.map((c) => {
                const tags = parseJson<string[]>(c.tags, []);
                return (
                  <tr key={c.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{formatPhone(c.phone)}</td>
                    <td className="p-3">{c.name || <span className="text-muted-foreground">—</span>}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {tags.map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                      </div>
                    </td>
                    <td className="p-3">
                      {c.optedOut ? <Badge variant="outline">Opt-out</Badge> : <Badge variant="success">Activo</Badge>}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {c.lastSeenAt ? new Date(c.lastSeenAt).toLocaleString('es-CO') : '—'}
                    </td>
                    <td className="p-3 text-right">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setCreating(false); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(c.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
