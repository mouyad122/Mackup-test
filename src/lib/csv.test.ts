import { describe, expect, it } from 'vitest';
import { escapeCsvCell } from './csv';

describe('CSV export cells', () => {
  it('quotes and escapes embedded quotes', () => {
    expect(escapeCsvCell('O"Brien, customer')).toBe('"O""Brien, customer"');
  });

  it('prevents spreadsheet formula execution, including after whitespace', () => {
    expect(escapeCsvCell('=HYPERLINK("https://example.invalid")')).toBe('"\'=HYPERLINK(""https://example.invalid"")"');
    expect(escapeCsvCell('  @SUM(1,1)')).toBe('"\'  @SUM(1,1)"');
  });
});
