import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Plus, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CategoriesRepository } from '@/data/repositories';
import { queryKeys } from '@/data/query-keys';
import { Button, LoadingState, Page } from '@/shared/components';
import { useAuthStore } from '@/features/auth/authStore';
import { useLedgerContext } from '@/features/ledger/useLedgerContext';
import { asJsonMerge } from './metadata';
import type { EnrichedCategory } from './categoryEnrichment';
import { useCategoryWorkspace } from './useCategoryWorkspace';
import { CategoryStats } from './components/CategoryStats';
import { CategoryFilters } from './components/CategoryFilters';
import { CategoryGrid } from './components/CategoryGrid';
import { CategoryDrawer } from './components/CategoryDrawer';
import { CreateCategoryModal, type CategoryFormPayload } from './components/CreateCategoryModal';
import { ArchiveSection } from './components/ArchiveSection';
import { EmptyWidget } from '@/features/dashboard/components/EmptyWidget';
import type { Json } from '@/types/finance';

export default function CategoriesPage() {
  const { user, household, loading } = useLedgerContext();
  const profile = useAuthStore((s) => s.profile);
  const currency = household?.default_currency ?? profile?.currency ?? 'USD';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const workspace = useCategoryWorkspace();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EnrichedCategory | null>(null);
  const [drawerCategory, setDrawerCategory] = useState<EnrichedCategory | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });

  const createMutation = useMutation({
    mutationFn: (values: CategoryFormPayload) =>
      CategoriesRepository.create({
        household_id: household!.id,
        user_id: user!.id,
        name: values.name,
        type: values.type,
        parent_id: values.parent_id,
        icon: values.icon,
        color: values.color,
        metadata: values.metadata as Json
      }),
    onSuccess: () => {
      setModalOpen(false);
      setEditing(null);
      invalidate();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values, previous }: { id: string; values: CategoryFormPayload; previous: EnrichedCategory }) =>
      CategoriesRepository.update(id, {
        name: values.name,
        type: values.type,
        parent_id: values.parent_id,
        icon: values.icon,
        color: values.color,
        metadata: asJsonMerge(previous.metadata, {
          ...values.metadata,
          archived: previous.archived || undefined,
          archived_at: previous.archivedAt || undefined
        })
      }),
    onSuccess: () => {
      setModalOpen(false);
      setEditing(null);
      setDrawerCategory(null);
      invalidate();
    }
  });

  const childrenOfDrawer = useMemo(() => {
    if (!drawerCategory) return [];
    return workspace.enriched.filter((c) => c.parent_id === drawerCategory.id && !c.archived);
  }, [drawerCategory, workspace.enriched]);

  if (loading || workspace.isLoading) return <LoadingState label="Loading categories" />;

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(category: EnrichedCategory) {
    setEditing(category);
    setModalOpen(true);
  }

  function exportCategories() {
    const rows = [
      ['Name', 'Type', 'Parent', 'Transactions', 'Total', 'Budget', 'Archived'].join(','),
      ...workspace.enriched.map((c) =>
        [c.name, c.type, c.parentName ?? '', c.usage.transactionCount, c.usage.totalAmount.toFixed(2), c.budget, c.archived].join(',')
      )
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'finlo-categories.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Page className="relative pb-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-[radial-gradient(ellipse_at_top,_rgba(180,167,214,0.14),_transparent_55%)]" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Categories</h1>
          <p className="mt-2 max-w-xl text-sm text-muted">Organize every transaction into meaningful groups.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="border border-border bg-transparent text-foreground hover:bg-secondary" onClick={() => navigate('/transactions')}>
            <Upload className="h-4 w-4" /> Import
          </Button>
          <Button className="border border-border bg-transparent text-foreground hover:bg-secondary" onClick={exportCategories}>
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button className="bg-success text-primary hover:bg-success/90" onClick={openCreate} disabled={!household}>
            <Plus className="h-4 w-4" /> New Category
          </Button>
        </div>
      </div>

      <CategoryStats stats={workspace.stats} />

      <CategoryFilters
        search={workspace.search}
        onSearch={workspace.setSearch}
        typeFilter={workspace.typeFilter}
        onTypeFilter={workspace.setTypeFilter}
        sort={workspace.sort}
        onSort={workspace.setSort}
        gridSize={workspace.gridSize}
        onGridSize={workspace.setGridSize}
      />

      {workspace.filtered.length === 0 && workspace.typeFilter !== 'archived' ? (
        <EmptyWidget
          title="No categories yet."
          message="Create your first category to start organizing transactions."
          ctaLabel="Create First Category"
          onCta={openCreate}
        />
      ) : workspace.typeFilter === 'archived' ? null : (
        <CategoryGrid
          categories={workspace.filtered}
          currency={currency}
          gridSize={workspace.gridSize}
          onOpen={setDrawerCategory}
          onEdit={openEdit}
          onArchive={(c) => CategoriesRepository.archive(c.id).then(invalidate)}
          onDelete={(c) => {
            if (window.confirm(`Delete “${c.name}” permanently?`)) {
              void CategoriesRepository.remove(c.id).then(invalidate);
            }
          }}
          onViewTransactions={() => navigate('/transactions')}
          onCreate={openCreate}
        />
      )}

      <ArchiveSection
        categories={workspace.archived}
        onRestore={(c) => CategoriesRepository.restore(c.id).then(invalidate)}
        onDelete={(c) => {
          if (window.confirm(`Permanently delete “${c.name}”?`)) {
            void CategoriesRepository.remove(c.id).then(invalidate);
          }
        }}
      />

      <CreateCategoryModal
        open={modalOpen}
        category={editing}
        parents={workspace.active}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={(values) => {
          if (editing) {
            updateMutation.mutate({ id: editing.id, values, previous: editing });
          } else {
            createMutation.mutate(values);
          }
        }}
      />

      <CategoryDrawer
        open={Boolean(drawerCategory)}
        category={drawerCategory}
        subcategories={childrenOfDrawer}
        recentTransactions={workspace.transactionsQuery.data ?? []}
        currency={currency}
        onClose={() => setDrawerCategory(null)}
        onEdit={() => {
          if (drawerCategory) openEdit(drawerCategory);
        }}
        onArchive={() => {
          if (!drawerCategory) return;
          void CategoriesRepository.archive(drawerCategory.id).then(() => {
            setDrawerCategory(null);
            invalidate();
          });
        }}
        onDelete={() => {
          if (!drawerCategory) return;
          if (window.confirm(`Delete “${drawerCategory.name}” permanently?`)) {
            void CategoriesRepository.remove(drawerCategory.id).then(() => {
              setDrawerCategory(null);
              invalidate();
            });
          }
        }}
      />
    </Page>
  );
}
