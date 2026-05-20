/**
 * Detecta si un mensaje del cliente pide ayuda de un asesor humano.
 * Regla simple por keywords — funciona bien en español para ~90% de los casos.
 */

const KEYWORDS = [
  'asesor',
  'asesora',
  'humano',
  'persona real',
  'una persona',
  'hablar con alguien',
  'hablar con una persona',
  'no me ayudas',
  'no me sirves',
  'no entiendes',
  'quiero hablar',
  'necesito ayuda',
  'urgente',
  'emergencia',
  'reclamo',
  'queja',
  'cancelar mi cita',
  'cancelar cita',
  'devolver mi dinero',
  'reembolso',
];

export function detectsEscalation(text: string): { needsHelp: boolean; reason?: string } {
  const t = text.toLowerCase();
  for (const k of KEYWORDS) {
    if (t.includes(k)) return { needsHelp: true, reason: `keyword: ${k}` };
  }
  return { needsHelp: false };
}
