/**
 * Cliente para Evolution API.
 * Las credenciales se leen primero desde la DB (IntegrationSettings)
 * y, si no están, desde el .env.
 */
import { getIntegrations } from './settings';

type Json = Record<string, unknown>;

async function call<T = unknown>(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  body?: Json
): Promise<T> {
  const integ = await getIntegrations();
  if (!integ.evolutionApiUrl || !integ.evolutionApiKey) {
    throw new Error('Evolution API no está configurada. Ve a /dashboard/integraciones.');
  }
  const res = await fetch(`${integ.evolutionApiUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      apikey: integ.evolutionApiKey,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const text = await res.text();
  let data: unknown;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    throw new Error(
      `Evolution API ${method} ${path} -> ${res.status}: ${
        typeof data === 'string' ? data : JSON.stringify(data)
      }`
    );
  }
  return data as T;
}

async function instanceName() {
  return (await getIntegrations()).evolutionInstance;
}

export const evolution = {
  async createInstance(webhookUrl: string) {
    const name = await instanceName();
    return call('POST', '/instance/create', {
      instanceName: name,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
      webhook: {
        url: webhookUrl,
        webhookByEvents: false,
        events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
      },
    });
  },

  async setWebhook(webhookUrl: string) {
    const name = await instanceName();
    return call('POST', `/webhook/set/${name}`, {
      webhook: {
        enabled: true,
        url: webhookUrl,
        webhookByEvents: false,
        events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
      },
    });
  },

  async connect() {
    const name = await instanceName();
    return call<{ base64?: string; code?: string; pairingCode?: string }>(
      'GET',
      `/instance/connect/${name}`
    );
  },

  async connectionState() {
    const name = await instanceName();
    return call<{ instance?: { state?: string; instanceName?: string } }>(
      'GET',
      `/instance/connectionState/${name}`
    );
  },

  async sendText(phone: string, text: string) {
    const name = await instanceName();
    return call('POST', `/message/sendText/${name}`, {
      number: phone,
      text,
    });
  },

  async sendMedia(phone: string, mediaUrl: string, caption?: string) {
    const name = await instanceName();
    return call('POST', `/message/sendMedia/${name}`, {
      number: phone,
      mediatype: 'image',
      media: mediaUrl,
      caption: caption ?? '',
    });
  },

  /**
   * Envía una imagen como base64 — útil cuando el archivo está en disco
   * y no quieres exponer una URL pública (ej. dev sin tunnel).
   */
  async sendMediaBase64(
    phone: string,
    base64: string,
    fileName: string,
    caption?: string
  ) {
    const name = await instanceName();
    return call('POST', `/message/sendMedia/${name}`, {
      number: phone,
      mediatype: 'image',
      media: base64,
      fileName,
      caption: caption ?? '',
    });
  },

  async logout() {
    const name = await instanceName();
    return call('DELETE', `/instance/logout/${name}`);
  },

  async instance() {
    return instanceName();
  },
};

export async function isEvolutionConfigured() {
  const integ = await getIntegrations();
  return Boolean(integ.evolutionApiUrl && integ.evolutionApiKey);
}
