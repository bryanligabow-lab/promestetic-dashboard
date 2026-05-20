import Anthropic from '@anthropic-ai/sdk';
import { prisma } from './prisma';
import { parseJson } from './utils';
import { getIntegrations } from './settings';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

interface BuildContextArgs {
  clientName?: string | null;
  clientPhone?: string;
}

async function buildContext({ clientName, clientPhone }: BuildContextArgs) {
  const [company, catalog] = await Promise.all([
    prisma.company.findFirst(),
    prisma.catalogItem.findMany({ where: { active: true }, orderBy: { type: 'asc' } }),
  ]);

  const lines: string[] = [];
  if (company) {
    lines.push(`# Empresa: ${company.name}`);
    if (company.description) lines.push(company.description);
    if (company.phone) lines.push(`Teléfono: ${company.phone}`);
    if (company.address) lines.push(`Dirección: ${company.address}`);
    if (company.website) lines.push(`Web: ${company.website}`);
    const hours = parseJson<Record<string, { open: string; close: string } | null>>(
      company.hours,
      {}
    );
    if (Object.keys(hours).length) {
      lines.push('\n## Horarios de atención');
      const labels: Record<string, string> = {
        mon: 'Lunes', tue: 'Martes', wed: 'Miércoles', thu: 'Jueves',
        fri: 'Viernes', sat: 'Sábado', sun: 'Domingo',
      };
      for (const [day, h] of Object.entries(hours)) {
        if (!h) { lines.push(`- ${labels[day] ?? day}: Cerrado`); continue; }
        lines.push(`- ${labels[day] ?? day}: ${h.open} - ${h.close}`);
      }
    }
  }

  if (catalog.length) {
    lines.push('\n## Catálogo (productos / servicios)');
    for (const item of catalog) {
      const priceStr = item.price != null ? ` — $${item.price.toLocaleString('es-CO')}` : '';
      lines.push(`- [${item.type}] ${item.name}${priceStr}: ${item.description}`);
    }
  }

  if (clientName || clientPhone) {
    lines.push('\n## Cliente actual');
    if (clientName) lines.push(`Nombre: ${clientName}`);
    if (clientPhone) lines.push(`Teléfono: ${clientPhone}`);
  }

  return lines.join('\n');
}

interface GenerateReplyArgs {
  history: ChatMessage[];
  incoming: string;
  clientName?: string | null;
  clientPhone?: string;
}

export async function generateReply({
  history,
  incoming,
  clientName,
  clientPhone,
}: GenerateReplyArgs): Promise<string> {
  const integ = await getIntegrations();
  if (!integ.anthropicApiKey) {
    throw new Error(
      'Falta API Key de Anthropic. Configúrala en /dashboard/integraciones'
    );
  }

  const cfg = await prisma.chatbotConfig.findFirst();
  if (!cfg) throw new Error('ChatbotConfig no encontrado. Configura el bot primero.');

  const client = new Anthropic({ apiKey: integ.anthropicApiKey });
  const context = await buildContext({ clientName, clientPhone });
  const rules = parseJson<string[]>(cfg.rules, []);
  const rulesBlock = rules.length
    ? '\n\n## Reglas duras (debes cumplirlas siempre)\n' + rules.map((r) => `- ${r}`).join('\n')
    : '';

  const systemPrompt = `${cfg.systemPrompt}\n\n${context}${rulesBlock}`;

  const userContent = cfg.userPromptTpl
    .replace('{message}', incoming)
    .replace('{client_name}', clientName ?? 'cliente')
    .replace('{client_phone}', clientPhone ?? '');

  const messages: ChatMessage[] = [...history, { role: 'user', content: userContent }];

  const resp = await client.messages.create({
    model: cfg.model || integ.claudeModel,
    max_tokens: cfg.maxTokens,
    temperature: cfg.temperature,
    system: systemPrompt,
    messages,
  });

  const text = resp.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('\n')
    .trim();

  return text || 'Lo siento, no pude generar una respuesta en este momento.';
}

export async function isClaudeConfigured() {
  const integ = await getIntegrations();
  return Boolean(integ.anthropicApiKey);
}
