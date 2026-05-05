export function getUtcDayBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0),
  );
  const end = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999),
  );

  return { start, end };
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function subtractHours(date: Date, hours: number): Date {
  return new Date(date.getTime() - hours * 60 * 60 * 1000);
}

export function createBookingNumber(): string {
  const randomSuffix = Math.floor(Math.random() * 9000 + 1000);
  const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 12);
  return `MTC-${timestamp}-${randomSuffix}`;
}
