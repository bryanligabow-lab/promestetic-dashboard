/**
 * Cliente HTTP que reemplaza a Prisma para hablar con Google Sheets
 * a través del Apps Script web app.
 *
 * El Apps Script expone:
 *   GET  ?entity=X&id=Y     → un registro
 *   GET  ?entity=X          → todos
 *   GET  ?entity=X&where=JSON → filtrados
 *   POST { entity, action: 'create'|'update'|'upsert'|'delete', data, id }
 *
 * API similar a Prisma para minimizar cambios en endpoints.
 */

const API_URL = process.env.SHEETS_API_URL || '';

if (!API_URL && process.env.NODE_ENV === 'production') {
  console.warn('[sheets-db] SHEETS_API_URL no configurada');
}

type Entity =
  | 'Company'
  | 'Clients'
  | 'Promotions'
  | 'PromotionSends'
  | 'Conversations'
  | 'Messages'
  | 'ChatbotConfig'
  | 'Integrations'
  | 'CatalogItems'
  | 'WhatsAppInstances';

async function get<T = any>(entity: Entity, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(API_URL);
  url.searchParams.set('entity', entity);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) throw new Error(`sheets-db GET ${entity}: ${res.status}`);
  const data = await res.json();
  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error(`sheets-db: ${data.error}`);
  }
  return data;
}

async function post<T = any>(body: object): Promise<T> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`sheets-db POST: ${res.status}`);
  const data = await res.json();
  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error(`sheets-db: ${data.error}`);
  }
  return data;
}

function makeRepo<T extends { id?: string }>(entity: Entity) {
  return {
    async findMany(filter?: Partial<T>): Promise<T[]> {
      const params: Record<string, string> = {};
      if (filter && Object.keys(filter).length) {
        params.where = JSON.stringify(filter);
      }
      return get<T[]>(entity, params);
    },

    async findFirst(filter?: Partial<T>): Promise<T | null> {
      const rows = await this.findMany(filter);
      return rows[0] || null;
    },

    async findUnique(args: { where: { id: string } }): Promise<T | null> {
      const id = args.where.id;
      return get<T | null>(entity, { id });
    },

    async create(args: { data: Partial<T> }): Promise<T> {
      return post<T>({ entity, action: 'create', data: args.data });
    },

    async update(args: { where: { id: string }; data: Partial<T> }): Promise<T> {
      return post<T>({ entity, action: 'update', id: args.where.id, data: args.data });
    },

    async upsert(args: { where: Record<string, any>; create: Partial<T>; update: Partial<T> }): Promise<T> {
      // Si where está vacío → singleton (Company, ChatbotConfig, Integrations)
      const whereKeys = Object.keys(args.where);
      if (whereKeys.length === 0) {
        return post<T>({ entity, action: 'upsert', data: { ...args.create, ...args.update } });
      }
      // Buscar por los campos del where
      const existing = await this.findFirst(args.where as Partial<T>);
      if (existing && (existing as any).id) {
        return this.update({ where: { id: (existing as any).id }, data: args.update });
      }
      return this.create({ data: args.create });
    },

    async delete(args: { where: { id: string } }): Promise<{ deleted: boolean }> {
      return post<{ deleted: boolean }>({ entity, action: 'delete', id: args.where.id });
    },

    async count(filter?: Partial<T>): Promise<number> {
      const rows = await this.findMany(filter);
      return rows.length;
    },
  };
}

/**
 * Cliente principal, mismo shape que Prisma:
 *   await sheetsDb.client.findMany({ optedOut: false })
 *   await sheetsDb.promotion.create({ data: {...} })
 */
export const sheetsDb = {
  company: makeRepo<any>('Company'),
  client: makeRepo<any>('Clients'),
  promotion: makeRepo<any>('Promotions'),
  promotionSend: makeRepo<any>('PromotionSends'),
  conversation: makeRepo<any>('Conversations'),
  message: makeRepo<any>('Messages'),
  chatbotConfig: makeRepo<any>('ChatbotConfig'),
  integrationSettings: makeRepo<any>('Integrations'),
  catalogItem: makeRepo<any>('CatalogItems'),
  whatsAppInstance: makeRepo<any>('WhatsAppInstances'),
};

export function isSheetsConfigured(): boolean {
  return Boolean(API_URL);
}
