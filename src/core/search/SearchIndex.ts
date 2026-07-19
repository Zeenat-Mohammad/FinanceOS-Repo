import type { SearchResultItem } from './types';

function tokenize(query: string) {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);
}

export function scoreMatch(query: string, fields: string[]) {
  const tokens = tokenize(query);
  if (!tokens.length) return 0;

  const haystack = fields.join(' ').toLowerCase();
  let score = 0;

  for (const token of tokens) {
    if (haystack === token) score += 120;
    else if (haystack.startsWith(token)) score += 80;
    else if (haystack.includes(` ${token}`)) score += 60;
    else if (haystack.includes(token)) score += 40;
  }

  return score;
}

export function rankResults(query: string, items: SearchResultItem[]) {
  return items
    .map((item) => ({
      ...item,
      score: Math.max(item.score, scoreMatch(query, [item.title, item.subtitle]))
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
}

export function dedupeResults(items: SearchResultItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.section}:${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
