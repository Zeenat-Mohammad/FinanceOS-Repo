import { useState } from 'react';
import { ChevronDown, RotateCcw, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Button, Card } from '@/shared/components';
import { cn } from '@/core/utils/cn';
import type { EnrichedCategory } from '../categoryEnrichment';
import { getCategoryIcon } from '../categoryIcons';

export function ArchiveSection({
  categories,
  onRestore,
  onDelete
}: {
  categories: EnrichedCategory[];
  onRestore: (c: EnrichedCategory) => void;
  onDelete: (c: EnrichedCategory) => void;
}) {
  const [open, setOpen] = useState(false);
  if (categories.length === 0) return null;

  return (
    <Card className="border-border/80 bg-surface/60 backdrop-blur-md">
      <button type="button" className="flex w-full items-center justify-between gap-2 text-left" onClick={() => setOpen((v) => !v)}>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Archive</h2>
          <p className="mt-1 text-xs text-muted">{categories.length} archived categor{categories.length === 1 ? 'y' : 'ies'} — not deleted</p>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-muted transition', open && 'rotate-180')} />
      </button>
      {open ? (
        <ul className="mt-4 space-y-2">
          {categories.map((category) => {
            const Icon = getCategoryIcon(category.name, category.icon);
            return (
              <li key={category.id} className="flex flex-wrap items-center gap-3 rounded-brand border border-border/50 bg-primary/30 px-3 py-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-brand bg-secondary/40 text-muted">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">{category.name}</div>
                  <div className="text-xs text-muted">
                    Archived {category.archivedAt ? format(parseISO(category.archivedAt), 'MMM d, yyyy') : '—'}
                  </div>
                </div>
                <Button className="h-8 border border-border bg-transparent px-2 text-xs text-foreground hover:bg-secondary" onClick={() => onRestore(category)}>
                  <RotateCcw className="h-3 w-3" /> Restore
                </Button>
                <Button className="h-8 bg-destructive px-2 text-xs text-destructive-foreground hover:bg-destructive" onClick={() => onDelete(category)}>
                  <Trash2 className="h-3 w-3" /> Delete permanently
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </Card>
  );
}
