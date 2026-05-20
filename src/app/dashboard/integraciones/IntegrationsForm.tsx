'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Smartphone, Globe, Eye, EyeOff, CheckCircle2, XCircle, Copy } from 'lucide-react';

interface Initial {
  anthropicApiKeyMasked: string;
  anthropicConfigured: boolean;
  sourceAnthropic: 'db' | 'env' | 'none';
  claudeModel: string;
  evolutionApiUrl: string;
  evolutionApiKeyMasked: string;
  evolutionConfigured: boolean;
  sourceEvolution: 'db' | 'env' | 'none';
  evolutionInstance: string;
  publicBaseUrl: string;
  webhookUrl: string;
}

export function IntegrationsForm({ initial }: { initial: Initial }) {
  // Anthropic
  const [anthropicKey, setAnthropicKey] = useState('');
  const [claudeModel, setClaudeModel] = useState(initial.claudeModel);
  const [showAnth, setShowAnth] = useState(false);
  const [savingAnth, setSavingAnth] = useState(false);
  const [testingAnth, setTestingAnth] = useState(false);

  // Evolution
  const [evoUrl, setEvoUrl] = useState(initial.evolutionApiUrl);
  const [evoKey, setEvoKey] = useState('');
  const [evoInstance, setEvoInstance] = useState(initial.evolutionInstance);
  const [showEvo, setShowEvo] = useState(false);
  const [savingEvo, setSavingEvo] = useState(false);
  const [testingEvo, setTestingEvo] = useState(false);
  const [evoTestResult, setEvoTestResult] = useState<any>(null);

  // Webhook / base URL
  const [publicBaseUrl, setPublicBaseUrl] = useState(initial.publicBaseUrl);

  async function saveAnthropic() {
    setSavingAnth(true);
    try {
      const body: any = { claudeModel };
      if (anthropicKey.trim()) body.anthropicApiKey = anthropicKey.trim();
      const res = await fetch('/api/integrations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Anthropic guardado. Recarga la página para ver el cambio.');
      setAnthropicKey('');
    } catch (e) {
      toast.error('Error: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSavingAnth(false);
    }
  }

  async function testAnthropic() {
    setTestingAnth(true);
    try {
      const body: any = { model: claudeModel };
      if (anthropicKey.trim()) body.apiKey = anthropicKey.trim();
      const res = await fetch('/api/integrations/test-anthropic', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) toast.success(`Conectado ✓  Respuesta: "${data.reply}"`);
      else toast.error(`Falló: ${data.error}`);
    } catch (e) {
      toast.error('Error: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setTestingAnth(false);
    }
  }

  async function saveEvolution() {
    setSavingEvo(true);
    try {
      const body: any = {
        evolutionApiUrl: evoUrl,
        evolutionInstance: evoInstance,
        publicBaseUrl,
      };
      if (evoKey.trim()) body.evolutionApiKey = evoKey.trim();
      const res = await fetch('/api/integrations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Evolution guardado. Recarga la página.');
      setEvoKey('');
    } catch (e) {
      toast.error('Error: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSavingEvo(false);
    }
  }

  async function testEvolution() {
    setTestingEvo(true);
    setEvoTestResult(null);
    try {
      const apiKey = evoKey.trim(); // si vacío, el backend usa la guardada — pero acá pedimos al usuario que la pegue para test
      const res = await fetch('/api/integrations/test-evolution', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiUrl: evoUrl,
          apiKey: apiKey || undefined,
          instance: evoInstance,
        }),
      });
      const data = await res.json();
      setEvoTestResult(data);
      if (data.ok) {
        if (data.foundInstance) {
          toast.success(`Instancia encontrada: ${data.foundInstance.status}`);
        } else {
          toast.warning(`Conectado, pero "${evoInstance}" no existe. Hay ${data.total} instancias.`);
        }
      } else {
        toast.error(`Falló: ${data.error}`);
      }
    } catch (e) {
      toast.error('Error: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setTestingEvo(false);
    }
  }

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  }

  return (
    <div className="space-y-6">
      {/* ============ Anthropic ============ */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Brain className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <CardTitle>Cerebro · Anthropic Claude</CardTitle>
                <CardDescription>El LLM que responde los mensajes del bot.</CardDescription>
              </div>
            </div>
            {initial.anthropicConfigured ? (
              <Badge variant="success" className="gap-1">
                <CheckCircle2 className="w-3 h-3" /> Conectado
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="w-3 h-3" /> Sin configurar
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>API Key actual</Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono">
                {initial.anthropicApiKeyMasked || '(no configurada)'}
              </code>
              <Badge variant="outline" className="text-xs">
                origen: {initial.sourceAnthropic}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nueva API Key (déjala vacía para no cambiar)</Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  type={showAnth ? 'text' : 'password'}
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                  placeholder="sk-ant-api03-..."
                  className="pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowAnth((v) => !v)}
                  className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                >
                  {showAnth ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Consigue tu API key en{' '}
              <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="underline">
                console.anthropic.com
              </a>
              .
            </p>
          </div>

          <div className="space-y-2">
            <Label>Modelo</Label>
            <Input
              value={claudeModel}
              onChange={(e) => setClaudeModel(e.target.value)}
              placeholder="claude-sonnet-4-6"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Recomendados: <code>claude-sonnet-4-6</code> (mejor),{' '}
              <code>claude-haiku-4-5-20251001</code> (más barato).
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={testAnthropic} disabled={testingAnth}>
              {testingAnth ? 'Probando...' : 'Probar conexión'}
            </Button>
            <Button onClick={saveAnthropic} disabled={savingAnth}>
              {savingAnth ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ============ Evolution API ============ */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle>WhatsApp · Evolution API</CardTitle>
                <CardDescription>Canal por donde envías y recibes mensajes.</CardDescription>
              </div>
            </div>
            {initial.evolutionConfigured ? (
              <Badge variant="success" className="gap-1">
                <CheckCircle2 className="w-3 h-3" /> Conectado
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="w-3 h-3" /> Sin configurar
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>URL del servidor Evolution</Label>
            <Input
              value={evoUrl}
              onChange={(e) => setEvoUrl(e.target.value)}
              placeholder="https://tu-evolution-api.com"
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label>API Key actual</Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono">
                {initial.evolutionApiKeyMasked || '(no configurada)'}
              </code>
              <Badge variant="outline" className="text-xs">
                origen: {initial.sourceEvolution}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nueva API Key (déjala vacía para no cambiar)</Label>
            <div className="relative">
              <Input
                type={showEvo ? 'text' : 'password'}
                value={evoKey}
                onChange={(e) => setEvoKey(e.target.value)}
                className="pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowEvo((v) => !v)}
                className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
              >
                {showEvo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nombre de la instancia</Label>
            <Input
              value={evoInstance}
              onChange={(e) => setEvoInstance(e.target.value)}
              placeholder="promestetic"
              className="font-mono"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={testEvolution} disabled={testingEvo}>
              {testingEvo ? 'Probando...' : 'Probar conexión'}
            </Button>
            <Button onClick={saveEvolution} disabled={savingEvo}>
              {savingEvo ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>

          {evoTestResult?.ok && (
            <div className="p-3 bg-muted rounded-md text-sm space-y-2">
              <p className="font-medium">Instancias disponibles ({evoTestResult.total}):</p>
              <ul className="text-xs space-y-1 font-mono">
                {evoTestResult.instances.map((i: any) => (
                  <li
                    key={i.name}
                    className={i.name === evoInstance ? 'font-bold text-primary' : ''}
                  >
                    • {i.name} — {i.status} {i.number ? `(${i.number})` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ============ Webhook ============ */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Globe className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Webhook público</CardTitle>
              <CardDescription>
                URL que Evolution usa para enviarte los mensajes entrantes.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Base URL pública (donde corre este dashboard)</Label>
            <Input
              value={publicBaseUrl}
              onChange={(e) => setPublicBaseUrl(e.target.value)}
              placeholder="https://abc.trycloudflare.com"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              En desarrollo usa un túnel:{' '}
              <code>cloudflared tunnel --url http://localhost:3000</code> o{' '}
              <code>ngrok http 3000</code>, y pega la URL https aquí.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Webhook que Evolution debe llamar</Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono break-all">
                {initial.webhookUrl}
              </code>
              <Button size="icon" variant="outline" onClick={() => copy(initial.webhookUrl, 'Webhook')}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Ya se setea automáticamente al pulsar "Crear instancia" en la página de WhatsApp.
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button onClick={saveEvolution} disabled={savingEvo}>
              Guardar base URL
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
