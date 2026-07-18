import type { Json } from '@/types/finance';

export function asJsonMerge(existing: Json, patch: Record<string, unknown>): Json {
  const base =
    existing && typeof existing === 'object' && !Array.isArray(existing) ? { ...(existing as Record<string, unknown>) } : {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      delete base[key];
    } else {
      base[key] = value;
    }
  }
  return base as Json;
}
