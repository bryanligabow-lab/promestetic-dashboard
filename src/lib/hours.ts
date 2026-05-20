import { parseJson } from './utils';

export type Hours = Record<string, { open: string; close: string } | null>;

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export function isWithinBusinessHours(hoursJson: string, timezone = 'America/Bogota'): boolean {
  const hours = parseJson<Hours>(hoursJson, {});
  if (!Object.keys(hours).length) return true;

  // Hora en la zona horaria de la empresa
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const weekday = parts.find((p) => p.type === 'weekday')?.value.toLowerCase().slice(0, 3) ?? 'mon';
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const min = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  const cur = hour * 60 + min;

  const dayCfg = hours[weekday] ?? hours[DAY_KEYS[new Date().getDay()]];
  if (!dayCfg) return false;

  const [oh, om] = dayCfg.open.split(':').map(Number);
  const [ch, cm] = dayCfg.close.split(':').map(Number);
  const open = oh * 60 + om;
  const close = ch * 60 + cm;
  return cur >= open && cur <= close;
}

export const DEFAULT_HOURS: Hours = {
  mon: { open: '09:00', close: '18:00' },
  tue: { open: '09:00', close: '18:00' },
  wed: { open: '09:00', close: '18:00' },
  thu: { open: '09:00', close: '18:00' },
  fri: { open: '09:00', close: '18:00' },
  sat: { open: '09:00', close: '14:00' },
  sun: null,
};
