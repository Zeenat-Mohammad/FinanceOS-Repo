import { Link } from 'react-router-dom';
import { Inbox } from 'lucide-react';
import { Card } from '@/shared/components';

export function EmptyWidget({
  title,
  message,
  ctaLabel,
  ctaTo,
  onCta
}: {
  title: string;
  message: string;
  ctaLabel: string;
  ctaTo?: string;
  onCta?: () => void;
}) {
  return (
    <Card className="grid place-items-center  py-8 text-center backdrop-blur-md">
      <Inbox className="h-7 w-7 text-accent" aria-hidden />
      <h3 className="mt-3 text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-muted">{message}</p>
      {onCta ? (
        <button type="button" className="mt-4 inline-flex rounded-md bg-success px-4 py-2 text-sm font-medium text-primary hover:bg-success/90" onClick={onCta}>
          {ctaLabel}
        </button>
      ) : ctaTo ? (
        <Link to={ctaTo} className="mt-4 inline-flex rounded-md bg-success px-4 py-2 text-sm font-medium text-primary hover:bg-success/90">
          {ctaLabel}
        </Link>
      ) : null}
    </Card>
  );
}
