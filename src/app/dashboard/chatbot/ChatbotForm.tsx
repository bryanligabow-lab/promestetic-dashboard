'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Send, Play, Plus, X } from 'lucide-react';
import { parseJson } from '@/lib/utils';

interface Initial {
  id?: string;
  systemPrompt?: string;
  userPromptTpl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  rules?: string;
  welcomeMessage?: string;
  offHoursMessage?: string;
  respectHours?: boolean;
  enabled?: boolean;
}

const DEFAULT_SYSTEM = `Eres el asistente virtual de la empresa. Atiendes a clientes por WhatsApp.

Tu rol:
- Resolver dudas sobre productos, servicios, precios, ubicación y horarios.
- Agendar citas y dar información de promociones.
- Ser cálido, profesional y conciso. Responde en español.

Si no sabes algo, dilo y ofrece comunicar al cliente con un humano.
NO inventes precios, horarios ni promociones que no estén en el contexto.`;

export function ChatbotForm({ initial }: { initial: Initial | null }) {
  const [systemPrompt, setSystemPrompt] = useState(initial?.systemPrompt ?? DEFAULT_SYSTEM);
  const [userPromptTpl, setUserPromptTpl] = useState(initial?.userPromptTpl ?? '{message}');
  const [model, setModel] = useState(initial?.model ?? 'claude-sonnet-4-6');
  const [temperature, setTemperature] = useState(initial?.temperature ?? 0.5);
  const [maxTokens, setMaxTokens] = useState(initial?.maxTokens ?? 1024);
  const [welcomeMessage, setWelcomeMessage] = useState(
    initial?.welcomeMessage ?? '¡Hola! 👋 Bienvenido(a). ¿En qué puedo ayudarte?'
  );
  const [offHoursMessage, setOffHoursMessage] = useState(
    initial?.offHoursMessage ??
      'Hola, en este momento estamos fuera de horario. Te responderemos apenas abramos.'
  );
  const [respectHours, setRespectHours] = useState(initial?.respectHours ?? true);
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [rules, setRules] = useState<string[]>(() => parseJson<string[]>(initial?.rules ?? '[]', []));
  const [newRule, setNewRule] = useState('');
  const [saving, setSaving] = useState(false);

  // Test del bot
  const [testInput, setTestInput] = useState('¿Cuáles son sus horarios?');
  const [testOutput, setTestOutput] = useState('');
  const [testing, setTesting] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt, userPromptTpl, model, temperature: Number(temperature),
          maxTokens: Number(maxTokens), welcomeMessage, offHoursMessage,
          respectHours, enabled, rules: JSON.stringify(rules),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Chatbot guardado');
    } catch (e) {
      toast.error('Error: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  }

  async function runTest() {
    setTesting(true);
    setTestOutput('');
    try {
      const res = await fetch('/api/chatbot/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: testInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setTestOutput(data.reply);
    } catch (e) {
      toast.error('Error: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Estado</CardTitle>
            <CardDescription>Activar / desactivar respuestas automáticas</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={enabled ? 'success' : 'outline'}>{enabled ? 'Activo' : 'Inactivo'}</Badge>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System prompt</CardTitle>
          <CardDescription>
            Rol del bot, tono y reglas generales. La info de empresa, horarios y catálogo se
            inyecta automáticamente, no la repitas aquí.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={12}
            className="font-mono text-sm"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plantilla de mensaje del usuario</CardTitle>
          <CardDescription>
            Variables disponibles: <code>{'{message}'}</code>, <code>{'{client_name}'}</code>,{' '}
            <code>{'{client_phone}'}</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={userPromptTpl}
            onChange={(e) => setUserPromptTpl(e.target.value)}
            rows={3}
            className="font-mono text-sm"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reglas duras</CardTitle>
          <CardDescription>
            Lista de reglas que el bot debe cumplir siempre. Ej: "Nunca des descuentos sin autorización".
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {rules.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex-1 p-2 bg-muted rounded-md text-sm">{r}</div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setRules((s) => s.filter((_, idx) => idx !== i))}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              placeholder="Nueva regla..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newRule.trim()) {
                  setRules((s) => [...s, newRule.trim()]);
                  setNewRule('');
                }
              }}
            />
            <Button
              type="button"
              onClick={() => {
                if (newRule.trim()) {
                  setRules((s) => [...s, newRule.trim()]);
                  setNewRule('');
                }
              }}
            >
              <Plus className="w-4 h-4" />
              Añadir
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mensajes automáticos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Mensaje de bienvenida (cliente nuevo)</Label>
            <Textarea value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Mensaje fuera de horario</Label>
            <Textarea value={offHoursMessage} onChange={(e) => setOffHoursMessage(e.target.value)} rows={2} />
          </div>
          <div className="flex items-center justify-between pt-2">
            <div>
              <p className="font-medium text-sm">Respetar horarios de atención</p>
              <p className="text-sm text-muted-foreground">
                Si está activo, fuera de horario envía el mensaje de arriba en vez de responder con IA.
              </p>
            </div>
            <Switch checked={respectHours} onCheckedChange={setRespectHours} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Modelo y parámetros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Modelo</Label>
            <Input value={model} onChange={(e) => setModel(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Temperature (0–1)</Label>
            <Input
              type="number" step="0.1" min="0" max="1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>Max tokens</Label>
            <Input
              type="number" min="100" max="4096"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value))}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="w-5 h-5" /> Probar el bot
          </CardTitle>
          <CardDescription>
            Envía un mensaje de prueba (no se envía a WhatsApp). Guarda los cambios primero.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="Escribe un mensaje..."
            />
            <Button onClick={runTest} disabled={testing}>
              <Send className="w-4 h-4" />
              {testing ? 'Pensando...' : 'Probar'}
            </Button>
          </div>
          {testOutput && (
            <div className="p-4 bg-muted rounded-md whitespace-pre-wrap text-sm">{testOutput}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
