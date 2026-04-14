/**
 * Date utility helpers for test data generation and assertions.
 */

export function formatDate(date: Date, format = 'YYYY-MM-DD'): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return format.replace('YYYY', String(y)).replace('MM', m).replace('DD', d);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function todayFormatted(format = 'YYYY-MM-DD'): string {
  return formatDate(new Date(), format);
}

export function futureDateFormatted(days: number, format = 'YYYY-MM-DD'): string {
  return formatDate(addDays(new Date(), days), format);
}
