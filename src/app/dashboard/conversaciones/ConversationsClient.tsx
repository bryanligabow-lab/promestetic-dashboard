'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, HandHelping, CheckCircle2, Pause, Play, RefreshCw } from 'lucide-react';
import { formatPhone } from '@/lib/utils';
import { playNotification, unlockAudio } from '@/lib/sound';

interface Client {
  id: string;
  phone: string;
  name: string | null;
}
interface Message {
  id: string;
  direction: 'in' | 'out';
  sender: string;
  content: string;
  mediaUrl: string | null;
  mediaType: string | null;
  createdAt: string;
}
interface Conversation {
  id: string;
  clientId: string;
  paused: boolean;
  needsHumanHelp: boolean;
  helpRequestedAt: string | null;
  helpReason: string | null;
  lastMsgAt: string;
  client: Client;
  messages: Message[];
}

const POLL_MS = 4000;

export function ConversationsClient() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [active, setActive] = useState<Conversation | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [loading, setLoading] = useState(true);
  const knownHelpIds = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);

  // Carga del listado (polling)
  async function loadList() {
    const res = await fetch('/api/conversations', { cache: 'no-store' });
    if (!res.ok) return;
    const data: Conversation[] = await res.json();
    setConversations(data);
    setLoading(false);

    // Detectar nuevas conversaciones que piden ayuda
    const currentHelp = new Set(data.filter((c) => c.needsHumanHelp).map((c) => c.id));
    if (!firstLoad.current) {
      for (const id of Array.from(currentHelp)) {
        if (!knownHelpIds.current.has(id)) {
          const conv = data.find((c) => c.id === id);
          const name = conv?.client.name || formatPhone(conv?.client.phone || '');
          toast.warning(`🆘 ${name} pide hablar con un asesor`, { duration: 8000 });
          if (soundOn) playNotification();
        }
      }
    }
    knownHelpIds.current = currentHelp;
    firstLoad.current = false;

    // Si no hay activo seleccionado, marca el primero
    if (!activeId && data[0]) setActiveId(data[0].id);
  }

  async function loadActive(id: string) {
    const res = await fetch(`/api/conversations/${id}`, { cache: 'no-store' });
    if (res.ok) setActive(await res.json());
  }

  // Poll list
  useEffect(() => {
    void loadList();
    const t = setInterval(loadList, POLL_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundOn]);

  // Poll active conversation
  useEffect(() => {
    if (!activeId) return;
    void loadActive(activeId);
    const t = setInterval(() => loadActive(activeId), POLL_MS);
    return () => clearInterval(t);
  }, [activeId]);

  async function togglePaused() {
    if (!active) return;
    const res = await fetch(`/api/conversations/${active.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paused: !active.paused }),
    });
    if (res.ok) {
      const updated = await res.json();
      setActive((a) => (a ? { ...a, paused: updated.paused } : a));
      toast.success(updated.paused ? 'Bot pausado en este chat' : 'Bot reactivado');
      void loadList();
    }
  }

  async function toggleHelp(toState: boolean, reason?: string) {
    if (!active) return;
    const res = await fetch(`/api/conversations/${active.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ needsHumanHelp: toState, helpReason: reason ?? 'manual' }),
    });
    if (res.ok) {
      const updated = await res.json();
      setActive((a) => (a ? { ...a, ...updated } : a));
      toast.success(toState ? 'Marcado para asesor' : 'Marcado como resuelto');
      void loadList();
    }
  }

  function handleToggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    if (next) {
      void unlockAudio();
      playNotification();
      toast.success('Notificaciones sonoras activadas');
    } else {
      toast.message('Notificaciones sonoras silenciadas');
    }
  }

  const helpCount = useMemo(
    () => conversations.filter((c) => c.needsHumanHelp).length,
    [conversations]
  );

  return (
    <div className="space-y-4">
      {/* Toolbar superior */}
      <div className="flex items-center justify-between bg-card border rounded-lg p-3">
        <div className="flex items-center gap-3">
          <Badge variant={helpCount > 0 ? 'destructive' : 'outline'}>
            {helpCount} {helpCount === 1 ? 'pide asesor' : 'piden asesor'}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => loadList()}>
            <RefreshCw className="w-3 h-3" /> Refrescar
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sonido</span>
          <Button
            variant={soundOn ? 'default' : 'outline'}
            size="sm"
            onClick={handleToggleSound}
          >
            {soundOn ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            {soundOn ? 'Activado' : 'Silenciado'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[70vh]">
        {/* Lista */}
        <Card className="overflow-y-auto">
          <CardContent className="p-0">
            {loading && (
              <p className="p-6 text-center text-muted-foreground text-sm">Cargando...</p>
            )}
            {!loading && conversations.length === 0 && (
              <p className="p-6 text-center text-muted-foreground text-sm">
                Sin conversaciones aún.
              </p>
            )}
            {conversations.map((c) => {
              const last = c.messages[0];
              const isActive = c.id === activeId;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className={`w-full text-left p-4 border-b transition-colors ${
                    isActive ? 'bg-accent' : 'hover:bg-accent/50'
                  } ${c.needsHumanHelp ? 'border-l-4 border-l-red-500' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <p className="font-medium text-sm">
                      {c.client.name || formatPhone(c.client.phone)}
                    </p>
                    <div className="flex gap-1">
                      {c.needsHumanHelp && (
                        <Badge variant="destructive" className="text-[10px]">
                          <HandHelping className="w-3 h-3" />
                        </Badge>
                      )}
                      {c.paused && (
                        <Badge variant="warning" className="text-[10px]">
                          <Pause className="w-3 h-3" />
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                    {last?.content ?? '...'}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(c.lastMsgAt).toLocaleString('es-CO')}
                  </p>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Detalle */}
        <Card className="md:col-span-2 flex flex-col">
          {active ? (
            <>
              {/* Header del chat */}
              <div className="p-4 border-b">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <p className="font-semibold">
                      {active.client.name || formatPhone(active.client.phone)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatPhone(active.client.phone)}
                    </p>
                    {active.needsHumanHelp && active.helpRequestedAt && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <HandHelping className="w-3 h-3" />
                        Pidió asesor {new Date(active.helpRequestedAt).toLocaleString('es-CO')}
                        {active.helpReason && ` · ${active.helpReason}`}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 items-start">
                    {active.needsHumanHelp ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleHelp(false)}
                      >
                        <CheckCircle2 className="w-4 h-4" /> Resolver
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => toggleHelp(true)}
                      >
                        <HandHelping className="w-4 h-4" /> Pedir asesor
                      </Button>
                    )}
                    <div className="flex items-center gap-2 pl-2 border-l">
                      <span className="text-xs text-muted-foreground">
                        Bot
                      </span>
                      <Switch
                        checked={!active.paused}
                        onCheckedChange={() => togglePaused()}
                      />
                      <span className="text-xs font-medium">
                        {active.paused ? (
                          <span className="text-amber-600 flex items-center gap-1">
                            <Pause className="w-3 h-3" /> Pausado
                          </span>
                        ) : (
                          <span className="text-emerald-600 flex items-center gap-1">
                            <Play className="w-3 h-3" /> Activo
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mensajes */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {active.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.direction === 'out' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        m.direction === 'out'
                          ? m.sender === 'promo'
                            ? 'bg-amber-100 text-amber-900'
                            : m.sender === 'agent'
                              ? 'bg-emerald-100 text-emerald-900'
                              : 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {m.mediaUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.mediaUrl} alt="" className="max-w-full rounded mb-2" />
                      )}
                      <p className="whitespace-pre-wrap text-sm">{m.content}</p>
                      <p className="text-[10px] opacity-70 mt-1">
                        {new Date(m.createdAt).toLocaleTimeString('es-CO')} · {m.sender}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <CardContent className="flex-1 flex items-center justify-center text-muted-foreground">
              Selecciona una conversación
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
