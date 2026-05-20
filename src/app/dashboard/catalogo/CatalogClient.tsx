'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ImageUpload } from '@/components/ImageUpload';
import { Plus, Trash2, Pencil } from 'lucide-react';

interface Item {
  id: string;
  type: string;
  name: string;
  description: string;
  price?: number;
  imageUrl?: string;
  tags: string;
  active: boolean;
}

export function CatalogClient({ initial }: { initial: Item[] }) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>(initial);
  const [editing, setEditing] = useState<Item | null>(null);
  const [creating, setCreating] = useState(false);

  function startNew() {
    setEditing({
      id: '', type: 'servicio', name: '', description: '',
      price: undefined, imageUrl: '', tags: '[]', active: true,
    });
    setCreating(true);
  }

  async function save(item: Item) {
    const method = creating ? 'POST' : 'PUT';
    const url = creating ? '/api/catalog' : `/api/catalog/${item.id}`;
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) { toast.error('Error guardando'); return; }
    toast.success('Guardado');
    setEditing(null);
    setCreating(false);
    router.refresh();
    const fresh = await fetch('/api/catalog').then((r) => r.json());
    setItems(fresh);
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar este ítem?')) return;
    const res = await fetch(`/api/catalog/${id}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('Error'); return; }
    setItems((s) => s.filter((i) => i.id !== id));
    toast.success('Eliminado');
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={startNew}>
          <Plus className="w-4 h-4" /> Nuevo ítem
        </Button>
      </div>

      {editing && (
        <Card>
          <CardHeader>
            <CardTitle>{creating ? 'Nuevo ítem' : 'Editar ítem'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={editing.type}
                  onChange={(e) => setEditing({ ...editing, type: e.target.value })}
                >
                  <option value="servicio">Servicio</option>
                  <option value="producto">Producto</option>
                  <option value="info">Información</option>
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Nombre</Label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div className="space-y-2 md:col-span-3">
                <Label>Descripción</Label>
                <Textarea
                  rows={3}
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Precio (opcional)</Label>
                <Input
                  type="number"
                  value={editing.price ?? ''}
                  onChange={(e) =>
                    setEditing({ ...editing, price: e.target.value ? parseFloat(e.target.value) : undefined })
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Tags (separados por coma)</Label>
                <Input
                  value={JSON.parse(editing.tags || '[]').join(', ')}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      tags: JSON.stringify(
                        e.target.value.split(',').map((t) => t.trim()).filter(Boolean)
                      ),
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Imagen</Label>
              <ImageUpload
                value={editing.imageUrl}
                onChange={(url) => setEditing({ ...editing, imageUrl: url })}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={editing.active}
                onCheckedChange={(c) => setEditing({ ...editing, active: c })}
              />
              <Label>Activo (se incluye en contexto del bot)</Label>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.length === 0 && (
          <p className="text-muted-foreground col-span-full text-center py-8">
            No hay ítems aún. Crea el primero para empezar.
          </p>
        )}
        {items.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            {item.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.imageUrl} alt={item.name} className="w-full h-40 object-cover" />
            )}
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <Badge variant="secondary" className="text-xs mt-1">{item.type}</Badge>
                </div>
                {item.active ? (
                  <Badge variant="success">Activo</Badge>
                ) : (
                  <Badge variant="outline">Oculto</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
              {item.price != null && (
                <p className="font-semibold text-primary">${item.price.toLocaleString('es-CO')}</p>
              )}
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => { setEditing(item); setCreating(false); }}>
                  <Pencil className="w-3 h-3" /> Editar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(item.id)}>
                  <Trash2 className="w-3 h-3" /> Eliminar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
