import { useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type PasswordInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function PasswordInput({ label, error, className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="block">
      <span className="text-sm text-muted">{label}</span>
      <div className="relative mt-1">
        <input className={`input pr-11 ${className ?? ''}`} type={visible ? 'text' : 'password'} {...props} />
        <button
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setVisible((current) => !current)}
          type="button"
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        </button>
      </div>
      {error ? <div className="mt-1 text-xs text-destructive">{error}</div> : null}
    </label>
  );
}
