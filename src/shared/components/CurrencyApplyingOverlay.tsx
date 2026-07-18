import { Loader2 } from 'lucide-react';
import { useCurrencyUiStore } from '@/shared/state/currencyUi';

/** Full-app overlay shown while currency conversion / refresh runs. */
export function CurrencyApplyingOverlay() {
  const converting = useCurrencyUiStore((s) => s.converting);
  const message = useCurrencyUiStore((s) => s.message);

  if (!converting) return null;

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-background/80 p-6 backdrop-blur-sm"
      role="alertdialog"
      aria-busy="true"
      aria-live="assertive"
      aria-label={message}
    >
      <div className="card-shell flex max-w-sm flex-col items-center gap-3 px-8 py-7 text-center shadow-lg">
        <Loader2 className="h-8 w-8 animate-spin text-accent" aria-hidden />
        <p className="text-sm font-medium text-foreground">{message}</p>
        <p className="text-xs text-muted">Amounts across Finlo are being recalculated. Please wait.</p>
      </div>
    </div>
  );
}
