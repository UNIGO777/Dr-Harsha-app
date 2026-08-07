import { Loader2 } from 'lucide-react';

/** Small shared primitives so pages stay focused on their own logic. */

export function Button({
  children,
  variant = 'primary',
  busy = false,
  className = '',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  busy?: boolean;
}) {
  const styles = {
    primary: 'bg-mint text-mint-ink hover:bg-mint-hi',
    secondary: 'border border-edge bg-surface text-ink hover:bg-surface-hi',
    ghost: 'text-ink-dim hover:bg-surface-hi hover:text-ink',
    danger: 'border border-danger/40 text-danger hover:bg-danger/10',
  }[variant];

  return (
    <button
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-medium transition disabled:opacity-50 ${styles} ${className}`}
      disabled={busy || rest.disabled}
      {...rest}
    >
      {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  );
}

export function Input({
  label,
  className = '',
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="block">
      {label && <span className="label-micro mb-1.5 block">{label}</span>}
      <input
        className={`h-10 w-full rounded-lg border border-edge bg-surface px-3 text-sm text-ink placeholder:text-ink-faint focus:border-mint/50 ${className}`}
        {...rest}
      />
    </label>
  );
}

export function Select({
  label,
  children,
  className = '',
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className="block">
      {label && <span className="label-micro mb-1.5 block">{label}</span>}
      <select
        className={`h-10 w-full rounded-lg border border-edge bg-surface px-3 text-sm text-ink focus:border-mint/50 ${className}`}
        {...rest}
      >
        {children}
      </select>
    </label>
  );
}

/** Status pill. `tone` maps to meaning, never decoration. */
export function Badge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'mint' | 'amber' | 'peri' | 'danger';
}) {
  const styles = {
    neutral: 'bg-surface-hi text-ink-dim',
    mint: 'bg-mint/12 text-mint',
    amber: 'bg-amber/12 text-amber',
    peri: 'bg-peri/12 text-peri',
    danger: 'bg-danger/12 text-danger',
  }[tone];
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${styles}`}>
      {children}
    </span>
  );
}

/**
 * Chip multi-select. Values come from a fixed vocabulary rather than free text
 * because these tags are matched EXACTLY against what the patient app stored —
 * a typo silently breaks recommendations instead of erroring.
 */
export function MultiSelect({
  label,
  hint,
  options,
  selected,
  onChange,
}: {
  label: string;
  hint?: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (value: string) =>
    onChange(
      selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value],
    );

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="label-micro">{label}</span>
        {selected.length > 0 && (
          <span className="text-[11px] text-ink-faint">{selected.length} selected</span>
        )}
      </div>
      {hint && <p className="mb-2 text-xs text-ink-faint">{hint}</p>}
      <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-edge bg-surface p-2.5">
        {options.map((opt) => {
          const active = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(opt.value)}
              className={`rounded-md px-2.5 py-1.5 text-xs transition ${
                active
                  ? 'bg-mint text-mint-ink'
                  : 'bg-surface-hi text-ink-dim hover:bg-surface-hi hover:text-ink'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-5 w-5 animate-spin text-mint" />
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-card border border-edge bg-surface px-6 py-12 text-center">
      <p className="text-sm text-ink">{message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ title, note }: { title: string; note?: string }) {
  return (
    <div className="rounded-card border border-dashed border-edge bg-surface/50 px-6 py-12 text-center">
      <p className="font-medium text-ink">{title}</p>
      {note && <p className="mt-1.5 text-sm text-ink-dim">{note}</p>}
    </div>
  );
}

/** Lightweight modal — no dependency, closes on backdrop click and Escape. */
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto overscroll-contain bg-black/60 p-0 sm:items-start sm:p-6 sm:pt-[8vh]"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      role="presentation"
    >
      {/* Sheet-style on phones (bottom-anchored, full width), centred card above sm. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-card border border-edge bg-surface p-5 sm:max-h-none sm:rounded-card sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-ink sm:text-lg">{title}</h2>
        <div className="mt-4 sm:mt-5">{children}</div>
      </div>
    </div>
  );
}
