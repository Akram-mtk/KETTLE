/**
 * Money is always an integer number of centimes. DZD is displayed with the
 * `fr-DZ` conventions: comma decimal separator, narrow-space thousands, DA suffix.
 */

const daFormatter = new Intl.NumberFormat('fr-DZ', {
  style: 'currency',
  currency: 'DZD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatDA(cents: number): string {
  return daFormatter.format(cents / 100);
}

/** Same as formatDA but without the currency suffix — for table cells. */
export function formatAmount(cents: number): string {
  return new Intl.NumberFormat('fr-DZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/**
 * Parse user input into centimes. Accepts "30", "30,50", "30.50", "1 200,75".
 * Returns null for anything that isn't a non-negative amount.
 */
export function parseDA(input: string): number | null {
  const cleaned = input.replace(/[\s  ]/g, '').replace(',', '.');
  if (cleaned === '') return null;
  if (!/^\d*\.?\d*$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

/** Parse user input into an integer quantity. Returns null if not a whole count. */
export function parseQty(input: string): number | null {
  const cleaned = input.replace(/[\s  ]/g, '');
  if (cleaned === '') return null;
  if (!/^\d+$/.test(cleaned)) return null;
  return Number(cleaned);
}

export function formatQty(quantity: number): string {
  return new Intl.NumberFormat('fr-DZ').format(quantity);
}

export const sumCents = (values: number[]): number => values.reduce((a, b) => a + b, 0);
