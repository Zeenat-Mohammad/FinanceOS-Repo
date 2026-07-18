import { useEffect, useRef, useState } from 'react';
import { formatCurrencyMinorUnits } from '@/core/utils/currency';

/** Animated counter for minor-unit money or plain numbers. */
export function AnimatedCounter({
  value,
  isMoney = false,
  currency = 'USD',
  decimals = 0,
  suffix = ''
}: {
  value: number;
  isMoney?: boolean;
  currency?: string;
  decimals?: number;
  suffix?: string;
}) {
  const [display, setDisplay] = useState(value);
  const frame = useRef<number | null>(null);
  const previous = useRef(value);

  useEffect(() => {
    const from = previous.current;
    const to = value;
    const start = performance.now();
    const duration = 480;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) frame.current = requestAnimationFrame(tick);
      else previous.current = to;
    };

    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [value]);

  if (isMoney) {
    return <>{formatCurrencyMinorUnits(Math.round(display), currency)}</>;
  }

  const formatted = decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString();
  return (
    <>
      {formatted}
      {suffix}
    </>
  );
}
