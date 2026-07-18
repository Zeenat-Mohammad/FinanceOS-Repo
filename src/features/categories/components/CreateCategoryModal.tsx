import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Modal } from '@/shared/components';
import type { Category, TransactionType } from '@/types/finance';
import { CATEGORY_ICON_OPTIONS, getCategoryIcon } from '../categoryIcons';
import { getCategoryMeta } from '@/data/repositories/CategoriesRepository';
import { defaultCategoryColor, getBrandColorValue } from '@/shared/brand';

const schema = z.object({
  name: z.string().min(1, 'Name required'),
  type: z.enum(['income', 'expense', 'transfer', 'refund', 'adjustment', 'opening_balance']),
  parent_id: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().min(1),
  description: z.string().optional(),
  budget: z.coerce.number().min(0).optional(),
  budget_applicable: z.boolean(),
  default_category: z.boolean(),
  recurring_allowed: z.boolean()
});

type FormValues = z.infer<typeof schema>;

export type CategoryFormPayload = {
  name: string;
  type: TransactionType;
  parent_id: string | null;
  icon: string | null;
  color: string;
  metadata: Record<string, unknown>;
};

export function CreateCategoryModal({
  open,
  category,
  parents,
  onClose,
  onSubmit
}: {
  open: boolean;
  category: Category | null;
  parents: Category[];
  onClose: () => void;
  onSubmit: (values: CategoryFormPayload) => void;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      type: 'expense',
      parent_id: '',
      icon: 'tag',
      color: getBrandColorValue('accentTeal') || defaultCategoryColor,
      description: '',
      budget: 0,
      budget_applicable: false,
      default_category: false,
      recurring_allowed: true
    }
  });

  useEffect(() => {
    if (!open) return;
    if (category) {
      const meta = getCategoryMeta(category);
      form.reset({
        name: category.name,
        type: category.type,
        parent_id: category.parent_id ?? '',
        icon: category.icon ?? 'tag',
        color: category.color ?? defaultCategoryColor,
        description: meta.description,
        budget: meta.budget,
        budget_applicable: meta.budgetApplicable,
        default_category: meta.defaultCategory,
        recurring_allowed: meta.recurringAllowed
      });
    } else {
      form.reset({
        name: '',
        type: 'expense',
        parent_id: '',
        icon: 'tag',
        color: getBrandColorValue('accentTeal') || defaultCategoryColor,
        description: '',
        budget: 0,
        budget_applicable: false,
        default_category: false,
        recurring_allowed: true
      });
    }
  }, [category, open, form]);

  const selectedIcon = form.watch('icon');

  return (
    <Modal open={open} title={category ? 'Edit Category' : 'New Category'} onClose={onClose}>
      <form
        className="grid max-h-[70vh] gap-3 overflow-y-auto sm:grid-cols-2"
        onSubmit={form.handleSubmit((values) => {
          onSubmit({
            name: values.name,
            type: values.type,
            parent_id: values.parent_id || null,
            icon: values.icon || null,
            color: values.color,
            metadata: {
              description: values.description?.trim() || '',
              budget: values.budget_applicable ? values.budget ?? 0 : 0,
              budget_applicable: values.budget_applicable,
              default_category: values.default_category,
              recurring_allowed: values.recurring_allowed
            }
          });
        })}
      >
        <label className="space-y-1 sm:col-span-2">
          <span className="text-xs text-muted">Name</span>
          <input className="input" {...form.register('name')} />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted">Type</span>
          <select className="select" {...form.register('type')}>
            {['income', 'expense', 'transfer', 'refund', 'adjustment', 'opening_balance'].map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted">Parent category</span>
          <select className="select" {...form.register('parent_id')}>
            <option value="">None</option>
            {parents
              .filter((p) => p.id !== category?.id)
              .map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.name}
                </option>
              ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted">Icon</span>
          <select className="select" {...form.register('icon')}>
            {CATEGORY_ICON_OPTIONS.map((icon) => (
              <option key={icon} value={icon}>
                {icon}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted">Color</span>
          <input className="input h-10" type="color" {...form.register('color')} />
        </label>
        <div className="flex items-center gap-2 sm:col-span-2">
          {(() => {
            const Preview = getCategoryIcon(form.watch('name') || 'Custom', selectedIcon);
            return (
              <span className="grid h-9 w-9 place-items-center rounded-brand bg-primary text-accent">
                <Preview className="h-4 w-4" />
              </span>
            );
          })()}
          <span className="text-xs text-muted">Icon preview</span>
        </div>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-xs text-muted">Description</span>
          <textarea className="input min-h-20" {...form.register('description')} />
        </label>
        <label className="flex items-center gap-2 sm:col-span-2">
          <input type="checkbox" {...form.register('budget_applicable')} />
          <span className="text-sm text-muted">Budget applicable</span>
        </label>
        {form.watch('budget_applicable') ? (
          <label className="space-y-1 sm:col-span-2">
            <span className="text-xs text-muted">Monthly budget</span>
            <input className="input" type="number" step="0.01" {...form.register('budget')} />
          </label>
        ) : null}
        <label className="flex items-center gap-2">
          <input type="checkbox" {...form.register('default_category')} />
          <span className="text-sm text-muted">Default category</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" {...form.register('recurring_allowed')} />
          <span className="text-sm text-muted">Recurring allowed</span>
        </label>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" className="border border-border bg-transparent text-foreground hover:bg-secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="bg-success text-primary hover:bg-success/90">
            {category ? 'Save Changes' : 'Save Category'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
