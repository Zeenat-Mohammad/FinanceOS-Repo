import { dedupeResults, rankResults } from './SearchIndex';
import type { GroupedSearchResults, SearchResultItem, SearchSection } from './types';
import { SEARCH_SECTION_LABELS, SEARCH_SECTION_ORDER } from './types';

export const GlobalSearchService = {
  group(results: SearchResultItem[]): GroupedSearchResults[] {
    const map = new Map<SearchSection, SearchResultItem[]>();
    for (const item of results) {
      const list = map.get(item.section) ?? [];
      list.push(item);
      map.set(item.section, list);
    }

    return SEARCH_SECTION_ORDER.filter((section) => map.has(section)).map((section) => ({
      section,
      label: SEARCH_SECTION_LABELS[section],
      items: map.get(section) ?? []
    }));
  },

  finalize(query: string, items: SearchResultItem[], limit = 40) {
    return rankResults(query, dedupeResults(items)).slice(0, limit);
  }
};
