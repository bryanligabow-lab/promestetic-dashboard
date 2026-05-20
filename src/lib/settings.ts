import { prisma } from './prisma';

export interface IntegrationsResolved {
  anthropicApiKey: string;
  claudeModel: string;
  evolutionApiUrl: string;
  evolutionApiKey: string;
  evolutionInstance: string;
  publicBaseUrl: string;
  sourceAnthropic: 'db' | 'env' | 'none';
  sourceEvolution: 'db' | 'env' | 'none';
}

/**
 * Carga la configuración de integraciones desde DB y, si falta algún campo,
 * usa el valor del .env como fallback.
 */
export async function getIntegrations(): Promise<IntegrationsResolved> {
  const row = await prisma.integrationSettings.findUnique({
    where: { id: 'singleton' },
  });

  const dbAnthropic = row?.anthropicApiKey?.trim() ?? '';
  const dbEvoKey = row?.evolutionApiKey?.trim() ?? '';

  return {
    anthropicApiKey: dbAnthropic || process.env.ANTHROPIC_API_KEY || '',
    claudeModel: row?.claudeModel?.trim() || process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
    evolutionApiUrl:
      row?.evolutionApiUrl?.trim() || process.env.EVOLUTION_API_URL || '',
    evolutionApiKey: dbEvoKey || process.env.EVOLUTION_API_KEY || '',
    evolutionInstance:
      row?.evolutionInstance?.trim() ||
      process.env.EVOLUTION_INSTANCE_NAME ||
      'promestetic',
    publicBaseUrl:
      row?.publicBaseUrl?.trim() ||
      process.env.PUBLIC_BASE_URL ||
      'http://localhost:3000',
    sourceAnthropic: dbAnthropic ? 'db' : process.env.ANTHROPIC_API_KEY ? 'env' : 'none',
    sourceEvolution: dbEvoKey ? 'db' : process.env.EVOLUTION_API_KEY ? 'env' : 'none',
  };
}

/** Máscara: muestra solo los últimos 4 chars. */
export function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '••••';
  return '••••••••' + key.slice(-4);
}
