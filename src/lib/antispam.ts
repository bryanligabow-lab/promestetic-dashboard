/**
 * Filtros y validaciones antispam para envíos masivos y mensajes entrantes.
 * Diseñado para listas de 5k-10k contactos donde un error puede tirar el número.
 */

// =========================
//  KEYWORDS de OPT-OUT
// =========================
// Si el cliente escribe alguna de estas palabras, lo damos de baja automáticamente.
const OPT_OUT_KEYWORDS = [
  'baja',
  'darme de baja',
  'dame de baja',
  'no más',
  'no mas',
  'no quiero',
  'no me envien',
  'no me envíen',
  'no me envies',
  'no me envíes',
  'stop',
  'cancelar suscripcion',
  'cancelar suscripción',
  'unsubscribe',
  'remove me',
  'quitarme',
  'eliminame',
  'elimíname',
  'sacame',
  'sácame',
  'no spam',
  'molesto',
  'me molesta',
];

export function detectOptOut(text: string): { optedOut: boolean; reason?: string } {
  const t = text.toLowerCase().trim();
  // Solo aplica a mensajes cortos (< 80 chars) — frases largas con "no quiero"
  // pueden ser falsos positivos ("no quiero la cita el martes").
  if (t.length > 80) return { optedOut: false };
  for (const k of OPT_OUT_KEYWORDS) {
    if (t.includes(k)) return { optedOut: true, reason: `stop_keyword: ${k}` };
  }
  return { optedOut: false };
}

// =========================
//  KEYWORDS de SPAM ENTRANTE
// =========================
// Mensajes que tu negocio NO envió pero que entran por WhatsApp (spammers).
const SPAM_KEYWORDS = [
  'casino',
  'viagra',
  'cialis',
  'crypto',
  'forex',
  'invertir ahora',
  'ganancias garantizadas',
  'doble tu dinero',
  'work from home',
  'trabaja desde casa ganando',
  'préstamo rápido',
  'prestamo rapido',
  'binance signal',
  'whatsapp business gratis',
  'verificación whatsapp',
  'verificacion whatsapp',
  'tu cuenta sera bloqueada',
  'tu cuenta será bloqueada',
];

export function detectSpamMessage(text: string): { isSpam: boolean; reason?: string } {
  const t = text.toLowerCase();
  for (const k of SPAM_KEYWORDS) {
    if (t.includes(k)) return { isSpam: true, reason: `spam_keyword: ${k}` };
  }
  // Heurística: mensaje con muchos links sospechosos
  const urlMatches = t.match(/https?:\/\/\S+/g) ?? [];
  if (urlMatches.length >= 3) {
    return { isSpam: true, reason: 'multiple_links' };
  }
  return { isSpam: false };
}

// =========================
//  VALIDACIÓN DE NÚMEROS
// =========================
/**
 * Valida formato E.164 sin "+". Acepta 10-15 dígitos.
 * Ej: "573001234567" ✓ , "300 123 4567" ✗ , "+57..." ✗
 */
export function isValidPhone(phone: string): boolean {
  if (!phone) return false;
  const clean = phone.replace(/\D/g, '');
  return clean.length >= 10 && clean.length <= 15;
}

/** Normaliza un número quitando espacios, guiones, paréntesis y "+". */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

// =========================
//  DEDUPLICACIÓN
// =========================
/**
 * Quita duplicados de una lista de teléfonos preservando el orden.
 * Importante en listas de miles donde puede haber duplicados (mismo número
 * con/sin código de país, mayúsculas distintas, etc.).
 */
export function dedupePhones<T extends { phone: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = normalizePhone(item.phone);
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

// =========================
//  RATE LIMITING — patrón humano/aleatorio
// =========================
/**
 * Genera una secuencia de "fases" de envío para simular comportamiento humano.
 * En vez de batches fijos, alterna entre 3 modos elegidos aleatoriamente:
 *
 *  - "burst":  ráfaga corta de 8-15 mensajes, 1-4s entre cada uno
 *  - "normal": tirada media de 5-12 mensajes, 15-45s entre cada uno
 *  - "pause":  no envía nada por 2-5 minutos
 *
 * El patrón no es predecible: 60% normal, 25% burst, 15% pause.
 * Esto evita que WhatsApp detecte un patrón "robotizado" tipo "100 cada 3 min".
 */
export type SendPhase =
  | { type: 'burst'; count: number; delayMs: () => number }
  | { type: 'normal'; count: number; delayMs: () => number }
  | { type: 'pause'; pauseMs: number };

function rand(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

/** Decide el próximo "modo" de envío de forma aleatoria con sesgo natural. */
export function nextPhase(): SendPhase {
  const r = Math.random();
  if (r < 0.15) {
    // 15%: pausa larga (2-5 min) sin enviar nada
    return { type: 'pause', pauseMs: rand(120_000, 300_000) };
  }
  if (r < 0.40) {
    // 25%: ráfaga corta (8-15 msgs, 1-4s entre c/u)
    return {
      type: 'burst',
      count: rand(8, 15),
      delayMs: () => rand(1000, 4000),
    };
  }
  // 60%: ritmo normal (5-12 msgs, 15-45s entre c/u)
  return {
    type: 'normal',
    count: rand(5, 12),
    delayMs: () => rand(15_000, 45_000),
  };
}

/**
 * Política "global" según tamaño total de la lista.
 * Solo se usa para decidir si necesitamos las pausas largas o no.
 * Para listas pequeñas (< 50) no aplicamos modo "pause" — sería excesivo.
 */
export function shouldUsePausePhases(totalRecipients: number): boolean {
  return totalRecipients > 50;
}

/**
 * Determina si un cliente está bloqueado para envíos por exceso de bounces.
 * 3 fallos consecutivos = no le mandes más (probablemente el número no existe
 * o ya no usa WhatsApp).
 */
export function isClientBouncedOut(bounceCount: number): boolean {
  return bounceCount >= 3;
}
