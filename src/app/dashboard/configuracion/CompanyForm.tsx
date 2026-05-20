'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ImageUpload } from '@/components/ImageUpload';
import { DEFAULT_HOURS, type Hours } from '@/lib/hours';

interface Initial {
  id?: string;
  name?: string;
  slug?: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  description?: string;
  hours?: string;
  timezone?: string;
}

const DAYS: { key: keyof Hours | string; label: string }[] = [
  { key: 'mon', label: 'Lunes' },
  { key: 'tue', label: 'Martes' },
  { key: 'wed', label: 'Miércoles' },
  { key: 'thu', label: 'Jueves' },
  { key: 'fri', label: 'Viernes' },
  { key: 'sat', label: 'Sábado' },
  { key: 'sun', label: 'Domingo' },
];

export function CompanyForm({ initial }: { initial: Initial | null }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? 'promestetic');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [website, setWebsite] = useState(initial?.website ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [logoUrl, setLogoUrl] = useState(initial?.logoUrl ?? '');
  const [timezone, setTimezone] = useState(initial?.timezone ?? 'America/Bogota');
  const [hours, setHours] = useState<Hours>(() => {
    try { return JSON.parse(initial?.hours || '{}') as Hours; } catch { return DEFAULT_HOURS; }
  });
  const [saving, setSaving] = useState(false);

  function updateDay(key: string, field: 'open' | 'close' | 'closed', value: string | boolean) {
    setHours((h) => {
      const next = { ...h };
      if (field === 'closed') {
        next[key] = (value as boolean) ? null : { open: '09:00', close: '18:00' };
      } else {
        const cur = next[key] ?? { open: '09:00', close: '18:00' };
        next[key] = { ...cur, [field]: value as string };
      }
      return next;
    });
  }

  async function onSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, slug, phone, email, address, website, description, logoUrl,
          timezone, hours: JSON.stringify(hours),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Empresa guardada');
    } catch (e) {
      toast.error('Error: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Información básica</CardTitle>
          <CardDescription>Nombre, contacto y descripción</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nombre de la empresa</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Promestetic" />
          </div>
          <div className="space-y-2">
            <Label>Slug (identificador)</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="promestetic" />
          </div>
          <div className="space-y-2">
            <Label>Teléfono</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+57 ..." />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contacto@..." />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Dirección</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Sitio web</Label>
            <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
          </div>
          <div className="space-y-2">
            <Label>Zona horaria</Label>
            <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="America/Bogota" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Descripción</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Centro de estética especializado en..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logo</CardTitle>
        </CardHeader>
        <CardContent>
          <ImageUpload value={logoUrl} onChange={setLogoUrl} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Horarios de atención</CardTitle>
          <CardDescription>El chatbot puede responder o no fuera de estos horarios</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {DAYS.map(({ key, label }) => {
            const cfg = hours[key];
            const closed = cfg == null;
            return (
              <div key={key} className="flex items-center gap-3">
                <div className="w-24 font-medium text-sm">{label}</div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={closed}
                    onChange={(e) => updateDay(key as string, 'closed', e.target.checked)}
                  />
                  Cerrado
                </label>
                {!closed && cfg && (
                  <>
                    <Input
                      type="time"
                      className="w-32"
                      value={cfg.open}
                      onChange={(e) => updateDay(key as string, 'open', e.target.value)}
                    />
                    <span className="text-muted-foreground">a</span>
                    <Input
                      type="time"
                      className="w-32"
                      value={cfg.close}
                      onChange={(e) => updateDay(key as string, 'close', e.target.value)}
                    />
                  </>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onSave} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>
    </div>
  );
}
