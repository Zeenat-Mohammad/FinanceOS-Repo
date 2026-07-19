import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pin, Search, X } from 'lucide-react';
import { useAuthStore } from '@/features/auth/authStore';
import { Modal } from '@/shared/components';
import { useGlobalSearch } from './useGlobalSearch';
import { SearchResultCard } from './SearchResultCard';
import {
  pushRecentSearch,
  readPinnedSearches,
  readRecentSearches,
  togglePinnedSearch
} from './searchHistory';
import type { SearchResultItem } from '@/core/search/types';

export function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const household = useAuthStore((state) => state.household);
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const currency = household?.default_currency ?? profile?.currency ?? 'USD';
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [pinned, setPinned] = useState<string[]>(() => readPinnedSearches());
  const [recent, setRecent] = useState<string[]>(() => readRecentSearches());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setDebouncedQuery('');
    setActiveIndex(0);
    setRecent(readRecentSearches());
    setPinned(readPinnedSearches());
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const { grouped, flat, isFetching } = useGlobalSearch(household?.id, user?.id, debouncedQuery, open, currency);

  const suggestions = useMemo(() => {
    if (debouncedQuery.length >= 2) return [];
    return [...pinned, ...recent.filter((item) => !pinned.includes(item))].slice(0, 8);
  }, [debouncedQuery, pinned, recent]);

  useEffect(() => {
    setActiveIndex(0);
  }, [debouncedQuery, flat.length]);

  function openResult(item: SearchResultItem) {
    pushRecentSearch(debouncedQuery || item.title);
    setRecent(readRecentSearches());
    onClose();
    navigate(item.href);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (!flat.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % flat.length);
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + flat.length) % flat.length);
    }
    if (event.key === 'Enter' && flat[activeIndex]) {
      event.preventDefault();
      openResult(flat[activeIndex]);
    }
  }

  return (
    <Modal open={open} title="Search Finlo" onClose={onClose}>
      <div className="space-y-4" onKeyDown={onKeyDown}>
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            ref={inputRef}
            aria-label="Global search"
            className="input h-11 w-full pl-9 pr-10"
            placeholder="Search accounts, transactions, goals, budgets, debts…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted hover:text-foreground"
              onClick={() => setQuery('')}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </label>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
          <kbd className="rounded border border-border px-1.5 py-0.5">↑↓</kbd> navigate
          <kbd className="rounded border border-border px-1.5 py-0.5">Enter</kbd> open
          <kbd className="rounded border border-border px-1.5 py-0.5">Esc</kbd> close
        </div>

        {suggestions.length && debouncedQuery.length < 2 ? (
          <section>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Recent & pinned</div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-primary/20 px-3 py-1 text-xs text-foreground hover:bg-secondary/50"
                  onClick={() => setQuery(item)}
                >
                  {pinned.includes(item) ? <Pin className="h-3 w-3" /> : null}
                  {item}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {debouncedQuery.length >= 2 ? (
          <div className="max-h-[min(50vh,28rem)] overflow-y-auto">
            {isFetching ? <div className="py-8 text-center text-sm text-muted">Searching…</div> : null}
            {!isFetching && !grouped.length ? (
              <div className="py-8 text-center text-sm text-muted">No matches for “{debouncedQuery}”.</div>
            ) : null}
            {grouped.map((group) => (
              <section key={group.section} className="mb-4">
                <div className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted">{group.label}</div>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const index = flat.findIndex((entry) => entry.id === item.id && entry.section === item.section);
                    return (
                      <SearchResultCard
                        key={`${item.section}-${item.id}`}
                        item={item}
                        active={index === activeIndex}
                        currency={currency}
                        onSelect={() => openResult(item)}
                      />
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : null}

        {debouncedQuery.length >= 2 ? (
          <div className="flex justify-end">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
              onClick={() => setPinned(togglePinnedSearch(debouncedQuery))}
            >
              <Pin className="h-3.5 w-3.5" />
              {pinned.some((item) => item.toLowerCase() === debouncedQuery.toLowerCase()) ? 'Unpin search' : 'Pin search'}
            </button>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

export function useSearchShortcut(onOpen: () => void) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isMac = navigator.platform.toLowerCase().includes('mac');
      const mod = isMac ? event.metaKey : event.ctrlKey;
      if (mod && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onOpen();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onOpen]);
}
