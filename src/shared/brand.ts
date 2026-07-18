export const finloPalette = {
  primary: 'var(--color-primary)',
  secondary: 'var(--color-secondary)',
  accentGreen: 'var(--color-accent-green)',
  accentPurple: 'var(--color-accent-purple)',
  accentTeal: 'var(--color-accent-teal)'
} as const;

export const finloChartPalette = [
  finloPalette.primary,
  finloPalette.secondary,
  finloPalette.accentGreen,
  finloPalette.accentPurple,
  finloPalette.accentTeal
] as const;

export const defaultCategoryColor = finloPalette.accentTeal;

export function getBrandColorValue(token: keyof typeof finloPalette) {
  if (typeof window === 'undefined') return '';

  const variableName = finloPalette[token].replace('var(', '').replace(')', '');
  return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
}
