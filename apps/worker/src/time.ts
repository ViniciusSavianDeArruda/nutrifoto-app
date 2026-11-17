/** tz = minutos a leste de UTC do fuso do cliente (Brasília = -180). Dias são strings "YYYY-MM-DD". */
const MIN = 60_000;
const DAY = 86_400_000;

export const isDay = (s: string | undefined): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

export function dayStartUtc(day: string, tz: number): Date {
  return new Date(Date.parse(`${day}T00:00:00Z`) - tz * MIN);
}

export const localDayBounds = (day: string, tz: number): [Date, Date] => {
  const start = dayStartUtc(day, tz);
  return [start, new Date(start.getTime() + DAY)];
};

export const localDate = (d: Date, tz: number): string => new Date(d.getTime() + tz * MIN).toISOString().slice(0, 10);
export const localToday = (tz: number, now = new Date()) => localDate(now, tz);
export const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);

/** "Hoje" no fuso configurado do app (usado no limite diário de IA). */
export function appToday(timezone: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Hora local (0–23) de um instante no fuso do cliente. */
export const localHour = (d: Date, tz: number) => new Date(d.getTime() + tz * MIN).getUTCHours();
