/**
 * PROMESTETIC — Apps Script como base de datos
 *
 * Recibe requests del dashboard Next.js (en EasyPanel) y lee/escribe en
 * el Google Sheet de la empresa. Reemplaza a Prisma + SQLite.
 *
 * --- INSTALACIÓN ---
 * 1. Abre tu Google Sheet
 * 2. Extensiones → Apps Script → pega TODO este archivo
 * 3. Implementar → Nueva implementación → Tipo: App web
 *    - Ejecutar como: yo (tu cuenta)
 *    - Quién tiene acceso: cualquiera (necesario para que el dashboard llame)
 * 4. Copia la URL y pégala en EasyPanel como env var SHEETS_API_URL
 *
 * --- ESTRUCTURA DE HOJAS ---
 * Crea estas hojas (tabs) en tu Sheet, con la primera fila como headers:
 *
 *   Company:        id | name | slug | logoUrl | phone | email | address | website | description | hours | timezone | createdAt | updatedAt
 *   Clients:        id | phone | name | email | tags | notes | optedOut | optedOutReason | bounceCount | isSpam | spamReason | lastSeenAt | createdAt | updatedAt
 *   Promotions:     id | title | message | imageUrl | active | scheduledAt | cronExpr | autoSendOnCreate | targetTags | lastSentAt | sendCount | createdAt | updatedAt
 *   PromotionSends: id | promotionId | clientId | status | error | sentAt
 *   Conversations:  id | clientId | paused | needsHumanHelp | helpRequestedAt | helpReason | lastMsgAt | createdAt
 *   Messages:       id | conversationId | direction | sender | content | mediaUrl | mediaType | externalId | createdAt
 *   ChatbotConfig:  id | systemPrompt | userPromptTpl | model | temperature | maxTokens | rules | welcomeMessage | offHoursMessage | respectHours | enabled | updatedAt
 *   Integrations:   id | anthropicApiKey | claudeModel | evolutionApiUrl | evolutionApiKey | evolutionInstance | publicBaseUrl | updatedAt
 */

// ID de tu Google Sheet (extráelo del URL: docs.google.com/spreadsheets/d/{ID}/edit)
const SHEET_ID = '1nYJ2u1EduQcQnSttoPL9RSeDybE9ICxH5v54J7w2O6M';

// Hojas válidas (deben coincidir con el nombre de los tabs)
const SHEETS = [
  'Company',
  'Clients',
  'Promotions',
  'PromotionSends',
  'Conversations',
  'Messages',
  'ChatbotConfig',
  'Integrations',
  'CatalogItems',
  'WhatsAppInstances',
];

// ============= API HTTP =============

function doGet(e) {
  try {
    const { entity, id, where } = e.parameter;
    if (!entity) return jsonResponse({ error: 'entity required' }, 400);
    if (!SHEETS.includes(entity)) return jsonResponse({ error: 'unknown entity' }, 400);

    if (id) {
      const row = findById(entity, id);
      return jsonResponse(row);
    }

    const filter = where ? JSON.parse(where) : null;
    const rows = readAll(entity, filter);
    return jsonResponse(rows);
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const { entity, action, data, id } = body;

    if (!entity || !SHEETS.includes(entity)) {
      return jsonResponse({ error: 'unknown entity' }, 400);
    }

    if (action === 'create') {
      const row = createRow(entity, data || {});
      return jsonResponse(row);
    }
    if (action === 'update') {
      if (!id) return jsonResponse({ error: 'id required for update' }, 400);
      const row = updateRow(entity, id, data || {});
      return jsonResponse(row);
    }
    if (action === 'upsert') {
      // Para Company, ChatbotConfig, Integrations (singletons)
      const row = upsertSingleton(entity, data || {});
      return jsonResponse(row);
    }
    if (action === 'delete') {
      if (!id) return jsonResponse({ error: 'id required for delete' }, 400);
      const ok = deleteRow(entity, id);
      return jsonResponse({ deleted: ok });
    }

    return jsonResponse({ error: 'unknown action' }, 400);
  } catch (err) {
    return jsonResponse({ error: String(err), stack: err.stack }, 500);
  }
}

// ============= HELPERS =============

function jsonResponse(obj, status) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet(name) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    // Inicializa headers si la hoja está vacía
    initHeaders(sh, name);
  }
  return sh;
}

function initHeaders(sh, entity) {
  const headers = HEADERS_BY_ENTITY[entity];
  if (headers && sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#f3f3f3');
  }
}

const HEADERS_BY_ENTITY = {
  Company: ['id', 'name', 'slug', 'logoUrl', 'phone', 'email', 'address', 'website', 'description', 'hours', 'timezone', 'createdAt', 'updatedAt'],
  Clients: ['id', 'phone', 'name', 'email', 'tags', 'notes', 'optedOut', 'optedOutReason', 'bounceCount', 'isSpam', 'spamReason', 'lastSeenAt', 'createdAt', 'updatedAt'],
  Promotions: ['id', 'title', 'message', 'imageUrl', 'active', 'scheduledAt', 'cronExpr', 'autoSendOnCreate', 'targetTags', 'lastSentAt', 'sendCount', 'createdAt', 'updatedAt'],
  PromotionSends: ['id', 'promotionId', 'clientId', 'status', 'error', 'sentAt'],
  Conversations: ['id', 'clientId', 'paused', 'needsHumanHelp', 'helpRequestedAt', 'helpReason', 'lastMsgAt', 'createdAt'],
  Messages: ['id', 'conversationId', 'direction', 'sender', 'content', 'mediaUrl', 'mediaType', 'externalId', 'createdAt'],
  ChatbotConfig: ['id', 'systemPrompt', 'userPromptTpl', 'model', 'temperature', 'maxTokens', 'rules', 'welcomeMessage', 'offHoursMessage', 'respectHours', 'enabled', 'updatedAt'],
  Integrations: ['id', 'anthropicApiKey', 'claudeModel', 'evolutionApiUrl', 'evolutionApiKey', 'evolutionInstance', 'publicBaseUrl', 'updatedAt'],
  CatalogItems: ['id', 'type', 'name', 'description', 'price', 'imageUrl', 'tags', 'active', 'createdAt', 'updatedAt'],
  WhatsAppInstances: ['id', 'instanceName', 'status', 'phoneNumber', 'qrCodeData', 'lastSyncAt', 'updatedAt'],
};

function getHeaders(entity) {
  const sh = getSheet(entity);
  if (sh.getLastRow() === 0) {
    initHeaders(sh, entity);
  }
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
}

function readAll(entity, filter) {
  const sh = getSheet(entity);
  if (sh.getLastRow() < 2) return [];
  const headers = getHeaders(entity);
  const range = sh.getRange(2, 1, sh.getLastRow() - 1, headers.length).getValues();
  const rows = range.map(r => rowToObj(r, headers));
  if (!filter) return rows;
  return rows.filter(r => Object.keys(filter).every(k => r[k] === filter[k]));
}

function findById(entity, id) {
  return readAll(entity).find(r => r.id === id) || null;
}

function rowToObj(row, headers) {
  const obj = {};
  headers.forEach((h, i) => {
    let v = row[i];
    // Normalizar fechas a ISO
    if (v instanceof Date) v = v.toISOString();
    obj[h] = v === '' ? null : v;
  });
  return obj;
}

function objToRow(obj, headers) {
  return headers.map(h => {
    const v = obj[h];
    if (v === undefined || v === null) return '';
    return v;
  });
}

function createRow(entity, data) {
  const sh = getSheet(entity);
  const headers = getHeaders(entity);
  const now = new Date().toISOString();
  const row = {
    id: data.id || generateId(),
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now,
    ...data,
  };
  sh.appendRow(objToRow(row, headers));
  return row;
}

function updateRow(entity, id, data) {
  const sh = getSheet(entity);
  const headers = getHeaders(entity);
  const allRows = sh.getRange(2, 1, sh.getLastRow() - 1, headers.length).getValues();
  const idIdx = headers.indexOf('id');

  for (let i = 0; i < allRows.length; i++) {
    if (allRows[i][idIdx] === id) {
      const current = rowToObj(allRows[i], headers);
      const updated = { ...current, ...data, id, updatedAt: new Date().toISOString() };
      sh.getRange(i + 2, 1, 1, headers.length).setValues([objToRow(updated, headers)]);
      return updated;
    }
  }
  throw new Error(`Row not found: ${entity}#${id}`);
}

function upsertSingleton(entity, data) {
  const sh = getSheet(entity);
  if (sh.getLastRow() < 2) {
    // Crear el primero
    return createRow(entity, { ...data, id: data.id || 'singleton' });
  }
  // Tomar el primer registro y actualizar
  const headers = getHeaders(entity);
  const first = sh.getRange(2, 1, 1, headers.length).getValues()[0];
  const current = rowToObj(first, headers);
  return updateRow(entity, current.id, data);
}

function deleteRow(entity, id) {
  const sh = getSheet(entity);
  const headers = getHeaders(entity);
  const idIdx = headers.indexOf('id');
  const allRows = sh.getRange(2, 1, sh.getLastRow() - 1, headers.length).getValues();
  for (let i = 0; i < allRows.length; i++) {
    if (allRows[i][idIdx] === id) {
      sh.deleteRow(i + 2);
      return true;
    }
  }
  return false;
}

function generateId() {
  // ID estilo cuid corto
  return 'c' + Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}

// ============= INIT (corre 1 vez para crear hojas con headers) =============

function init() {
  SHEETS.forEach(name => getSheet(name));
  Logger.log('Hojas inicializadas: ' + SHEETS.join(', '));
}
