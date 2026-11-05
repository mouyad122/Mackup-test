export function escapeCsvCell(value: string | number | null | undefined): string {
  const raw = String(value ?? '-');
  const safe = /^[\s]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}
