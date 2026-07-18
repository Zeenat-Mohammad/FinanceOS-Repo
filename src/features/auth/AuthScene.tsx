import type { ReactNode } from 'react';
import { cn } from '@/core/utils/cn';

type AuthSceneProps = {
  children: ReactNode;
  cardClassName?: string;
  contentClassName?: string;
  framed?: boolean;
};

export function AuthScene({ children, cardClassName, contentClassName, framed = true }: AuthSceneProps) {
  return (
    <div className="auth-scene min-h-screen overflow-hidden bg-background text-foreground">
      <div className={cn('relative z-10 min-h-screen', contentClassName ?? 'flex items-center justify-center p-4')}>
        {framed ? <div className={cn('auth-card w-full p-6', cardClassName)}>{children}</div> : children}
      </div>
    </div>
  );
}

