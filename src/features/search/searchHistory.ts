const RECENT_KEY = 'finlo.search.recent';
const PINNED_KEY = 'finlo.search.pinned';

export function readRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

export function pushRecentSearch(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return;
  const next = [trimmed, ...readRecentSearches().filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(0, 8);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

export function readPinnedSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(PINNED_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

export function togglePinnedSearch(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return readPinnedSearches();
  const current = readPinnedSearches();
  const exists = current.some((item) => item.toLowerCase() === trimmed.toLowerCase());
  const next = exists ? current.filter((item) => item.toLowerCase() !== trimmed.toLowerCase()) : [trimmed, ...current].slice(0, 6);
  localStorage.setItem(PINNED_KEY, JSON.stringify(next));
  return next;
}
