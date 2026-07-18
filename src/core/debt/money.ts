/** Convert major currency units to integer minor units (cents). */
export function toMinor(amount: number): number {
  return Math.round(amount * 100);
}

/** Convert integer minor units to major currency units. */
export function fromMinor(amountMinor: number): number {
  return amountMinor / 100;
}

/** Round a floating minor-unit calculation to the nearest cent. */
export function roundMinor(value: number): number {
  return Math.round(value);
}

/**
 * Monthly interest in minor units.
 * Interest = Remaining Balance × (APR / 12)
 */
export function calculateInterest(balanceMinor: number, aprPercent: number): number {
  if (balanceMinor <= 0 || aprPercent <= 0) return 0;
  return roundMinor(balanceMinor * (aprPercent / 100 / 12));
}

export function formatMonthLabel(year: number, month: number): string {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[month]} ${year}`;
}

export function addMonths(startYear: number, startMonth: number, offset: number): { year: number; month: number } {
  const absolute = startYear * 12 + startMonth + offset;
  return {
    year: Math.floor(absolute / 12),
    month: ((absolute % 12) + 12) % 12
  };
}
