/** Normaliza tags (array o string) a string JSON para SQLite. */
export function normalizeTags(input: unknown): string {
  if (Array.isArray(input)) return JSON.stringify(input);
  if (typeof input === 'string' && input.length) return input;
  return '[]';
}
