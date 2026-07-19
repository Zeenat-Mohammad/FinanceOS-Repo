import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Inbox, Loader2, Search, X } from 'lucide-react';
import { cn } from '@/core/utils/cn';
import { useToastStore, type ToastVariant } from '@/shared/toast/toastStore';
export { BrandLogo } from './BrandLogo';
export { toast } from '@/shared/toast/toastStore';

export function Button({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md bg-[var(--color-button)] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--color-button-hover)] focus:outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
      {...props}
    />
  );
}

export function Page({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('space-y-6', className)} {...props} />;
}

export function Section({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn('space-y-4', className)} {...props} />;
}

export function ContentContainer({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8', className)} {...props} />;
}

export function PageHeader({
  title,
  description,
  action,
  className
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('card-shell p-4', className)} {...props} />;
}

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <Card>
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-foreground">{value}</div>
      {hint ? <div className="mt-2 text-xs text-muted">{hint}</div> : null}
    </Card>
  );
}

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="card-shell overflow-x-auto p-0">
      <table className={cn('w-full min-w-full divide-y divide-border text-sm', className)} {...props} />
    </div>
  );
}

export function Modal({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-sm">
      <div className="card-shell w-full max-w-lg p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <button aria-label="Close" className="rounded-md p-1 text-muted hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-accent" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export function Drawer({ open, children, onClose }: { open: boolean; children: ReactNode; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 bg-background/70 lg:hidden" onClick={onClose}>
      <aside
        className="h-full w-72 border-r border-border bg-[var(--color-sidebar)] p-4 text-[var(--color-sidebar-foreground)]"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </aside>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  onConfirm,
  onCancel
}: {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <p className="text-sm text-muted">{description}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button className="border border-border bg-transparent text-foreground hover:bg-secondary" onClick={onCancel}>Cancel</Button>
        <Button onClick={onConfirm}>Confirm</Button>
      </div>
    </Modal>
  );
}

export function EmptyState({ title, message, action }: { title: string; message?: string; action?: ReactNode }) {
  return (
    <Card className="grid place-items-center py-10 text-center">
      <Inbox aria-hidden="true" className="h-8 w-8 text-accent" />
      <h2 className="mt-3 text-base font-semibold text-foreground">{title}</h2>
      {message ? <p className="mt-2 max-w-md text-sm text-muted">{message}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </Card>
  );
}

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted">
      <Loader2 className="h-4 w-4 animate-spin text-accent" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ title, message, action }: { title: string; message?: string; action?: ReactNode }) {
  return (
    <Card className="grid place-items-center py-10 text-center">
      <AlertTriangle className="h-8 w-8 text-purple" />
      <h2 className="mt-3 text-base font-semibold text-foreground">{title}</h2>
      {message ? <p className="mt-2 max-w-md text-sm text-muted">{message}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </Card>
  );
}

export function SearchInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="relative block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        className={cn('h-10 w-full rounded-md border border-border bg-surface-muted py-2 pl-9 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent', className)}
        type="search"
        {...props}
      />
    </label>
  );
}

export function FilterBar({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-wrap items-center gap-2', className)} {...props} />;
}

export function ActionBar({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-wrap items-center justify-end gap-2', className)} {...props} />;
}

export function TooltipProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  return (
    <div id="app-toaster" className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(92vw,22rem)] flex-col gap-2">
      {toasts.map((item) => (
        <div
          key={item.id}
          role="status"
          className={cn(
            'pointer-events-auto rounded-brand border px-3 py-2.5 shadow-lg backdrop-blur-sm',
            toastVariantClass(item.variant)
          )}
        >
          <div className="flex items-start gap-2">
            <ToastIcon variant={item.variant} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-foreground">{item.title}</div>
              {item.description ? <div className="mt-0.5 text-xs text-muted">{item.description}</div> : null}
            </div>
            <button
              type="button"
              aria-label="Dismiss notification"
              className="rounded-md p-0.5 text-muted hover:bg-primary/40 hover:text-foreground"
              onClick={() => dismiss(item.id)}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ToastIcon({ variant }: { variant: ToastVariant }) {
  if (variant === 'success') return <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />;
  if (variant === 'error') return <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />;
  return <Inbox className="mt-0.5 h-4 w-4 shrink-0 text-accent" />;
}

function toastVariantClass(variant: ToastVariant) {
  if (variant === 'success') return 'border-success/30 bg-success/10';
  if (variant === 'error') return 'border-destructive/30 bg-destructive/10';
  return 'border-border/70 bg-surface/95';
}
