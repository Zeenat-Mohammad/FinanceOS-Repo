import finloLogo from '@/assets/ChatGPT Image Jul 17, 2026, 10_15_43 AM.png';
import { cn } from '@/core/utils/cn';

type BrandLogoProps = {
  compact?: boolean;
  className?: string;
  markClassName?: string;
};

export function BrandLogo({ compact = false, className, markClassName }: BrandLogoProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className={cn('grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-brand bg-white p-1.5 shadow-card', markClassName)}>
        <img className="h-full w-full object-contain" src={finloLogo} alt="Finlo logo" />
      </span>
      {!compact ? (
        <span className="leading-tight">
          <span className="block text-base font-semibold tracking-tight text-inherit">Finlo</span>
          <span className="block text-[10px] uppercase tracking-[0.2em] text-success">Plan · Track · Grow</span>
        </span>
      ) : null}
    </div>
  );
}
