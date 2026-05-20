'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Link as LinkIcon, RefreshCw, Power, QrCode } from 'lucide-react';

interface Instance {
  id: string;
  instanceName: string;
  status: string;
  phoneNumber?: string;
  qrCodeData?: string;
  lastSyncAt?: string;
}

interface Props {
  initial: Instance | null;
  baseUrl: string;
  evolutionUrl: string;
  instanceName: string;
}

export function WhatsAppClient({ initial, baseUrl, evolutionUrl, instanceName }: Props) {
  const [instance, setInstance] = useState<Instance | null>(initial);
  const [loading, setLoading] = useState(false);

  const webhookUrl = baseUrl ? `${baseUrl}/api/webhook/evolution` : '';

  async function createInstance() {
    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp/create', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      toast.success('Instancia creada en Evolution API');
      await refresh();
    } catch (e) {
      toast.error('Error: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  }

  async function connect() {
    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp/connect', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setInstance((s) => s ? { ...s, qrCodeData: data.qrCodeData, status: 'qr_pending' } : s);
      toast.success('QR generado. Escanea con WhatsApp.');
    } catch (e) {
      toast.error('Error: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    const res = await fetch('/api/whatsapp/status');
    if (res.ok) setInstance(await res.json());
  }

  async function disconnect() {
    if (!confirm('¿Desconectar WhatsApp?')) return;
    const res = await fetch('/api/whatsapp/disconnect', { method: 'POST' });
    if (res.ok) {
      toast.success('Desconectado');
      await refresh();
    }
  }

  // Polling cuando QR está pendiente
  useEffect(() => {
    if (instance?.status === 'qr_pending') {
      const t = setInterval(refresh, 5000);
      return () => clearInterval(t);
    }
  }, [instance?.status]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" /> Estado de la instancia
              </CardTitle>
              <CardDescription>{instanceName}</CardDescription>
            </div>
            <Badge
              variant={
                instance?.status === 'connected' ? 'success' :
                instance?.status === 'qr_pending' ? 'warning' : 'outline'
              }
            >
              {instance?.status ?? 'no creada'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {instance?.phoneNumber && (
            <div>
              <p className="text-sm text-muted-foreground">Número conectado</p>
              <p className="font-mono">{instance.phoneNumber}</p>
            </div>
          )}
          <div className="flex gap-2 flex-wrap">
            {!instance && (
              <Button onClick={createInstance} disabled={loading}>
                <LinkIcon className="w-4 h-4" /> Crear instancia
              </Button>
            )}
            <Button onClick={connect} disabled={loading || !instance}>
              <QrCode className="w-4 h-4" /> Generar QR
            </Button>
            <Button variant="outline" onClick={refresh}>
              <RefreshCw className="w-4 h-4" /> Refrescar estado
            </Button>
            {instance?.status === 'connected' && (
              <Button variant="destructive" onClick={disconnect}>
                <Power className="w-4 h-4" /> Desconectar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {instance?.qrCodeData && instance.status === 'qr_pending' && (
        <Card>
          <CardHeader>
            <CardTitle>Escanea este código con WhatsApp</CardTitle>
            <CardDescription>
              WhatsApp → Configuración → Dispositivos vinculados → Vincular un dispositivo
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={instance.qrCodeData.startsWith('data:') ? instance.qrCodeData : `data:image/png;base64,${instance.qrCodeData}`}
              alt="QR WhatsApp"
              className="w-64 h-64 border rounded-lg"
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Configuración</CardTitle>
          <CardDescription>Estos valores vienen de tu archivo .env</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Evolution API URL</span>
            <code className="bg-muted px-2 py-0.5 rounded text-xs">{evolutionUrl || 'no configurada'}</code>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Webhook (para Evolution)</span>
            <code className="bg-muted px-2 py-0.5 rounded text-xs break-all">{webhookUrl || 'no configurado'}</code>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Instancia</span>
            <code className="bg-muted px-2 py-0.5 rounded text-xs">{instanceName}</code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
