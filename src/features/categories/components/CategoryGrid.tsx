import { cn } from '@/core/utils/cn';
import type { EnrichedCategory } from '../categoryEnrichment';
import type { GridSize } from '../useCategoryWorkspace';
import { CategoryCard } from './CategoryCard';

export function CategoryGrid({
  categories,
  currency,
  gridSize,
  onOpen,
  onEdit,
  onArchive,
  onDelete,
  onViewTransactions
}: {
  categories: EnrichedCategory[];
  currency: string;
  gridSize: GridSize;
  onOpen: (c: EnrichedCategory) => void;
  onEdit: (c: EnrichedCategory) => void;
  onArchive: (c: EnrichedCategory) => void;
  onDelete: (c: EnrichedCategory) => void;
  onViewTransactions: (c: EnrichedCategory) => void;
  onCreate?: () => void;
}) {
  return (
    <section
      className={cn(
        'grid gap-4',
        gridSize === 'small' && 'sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5',
        gridSize === 'medium' && 'sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4',
        gridSize === 'large' && 'sm:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3'
      )}
      aria-label="Category cards"
    >
      {categories.map((category) => (
        <CategoryCard
          key={category.id}
          category={category}
          currency={currency}
          size={gridSize}
          onOpen={() => onOpen(category)}
          onEdit={() => onEdit(category)}
          onArchive={() => onArchive(category)}
          onDelete={() => onDelete(category)}
          onViewTransactions={() => onViewTransactions(category)}
        />
      ))}
    </section>
  );
}
