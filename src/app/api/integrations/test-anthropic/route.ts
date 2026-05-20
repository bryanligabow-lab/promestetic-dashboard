import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getIntegrations } from '@/lib/settings';

/**
 * Prueba la API key de Anthropic con un ping mínimo.
 * Si body.apiKey está presente, usa esa (sin guardarla); si no, usa la guardada.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  let apiKey: string = body?.apiKey?.trim?.() ?? '';
  let model = body?.model || 'claude-haiku-4-5-20251001';

  if (!apiKey) {
    const integ = await getIntegrations();
    apiKey = integ.anthropicApiKey;
    if (!model) model = integ.claudeModel;
  }
  if (!apiKey) {
    return NextResponse.json({ error: 'No hay API key configurada' }, { status: 400 });
  }

  try {
    const client = new Anthropic({ apiKey });
    const r = await client.messages.create({
      model,
      max_tokens: 20,
      messages: [{ role: 'user', content: 'di "ok"' }],
    });
    const text = r.content.filter((b) => b.type === 'text').map((b: any) => b.text).join('');
    return NextResponse.json({ ok: true, model, reply: text });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e), status: e?.status },
      { status: 200 }
    );
  }
}
