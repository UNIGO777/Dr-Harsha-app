import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, KeyRound, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react';

import { errorMessage } from '@/api/client';
import * as authApi from '@/features/auth/api';
import { useAuthStore } from '@/features/auth/useAuthStore';

/**
 * Staff sign-in. Two-phase by design: email + password first, and the
 * authenticator field only appears if the backend reports the account has TOTP
 * enrolled (`totpRequired`). That keeps the common case to two fields while
 * still supporting 2FA.
 */
export function LoginPage() {
  const navigate = useNavigate();
  const signIn = useAuthStore((s) => s.signIn);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [needsTotp, setNeedsTotp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await authApi.login({
        email,
        password,
        totpCode: needsTotp ? totpCode : undefined,
      });

      if (result.totpRequired) {
        setNeedsTotp(true);
        setError(null);
        return;
      }

      signIn(
        { accessToken: result.accessToken, refreshToken: result.refreshToken },
        result.staff,
      );
      navigate('/', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Could not sign you in'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-[400px]">
        {/* Brand */}
        <div className="mb-8 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-mint/12">
            <Activity className="h-5 w-5 text-mint" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[13px] font-bold tracking-[0.2em] text-mint">SANCHARA</p>
            <p className="text-xs text-ink-dim">Clinical portal</p>
          </div>
        </div>

        <h1 className="text-2xl font-semibold text-ink">Sign in</h1>
        <p className="mt-1.5 text-sm text-ink-dim">
          Manage patients, programs and content.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <Field
            id="email"
            label="Email"
            icon={<Mail className="h-4 w-4" />}
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@clinic.com"
            autoComplete="username"
            disabled={busy || needsTotp}
            required
          />

          <Field
            id="password"
            label="Password"
            icon={<Lock className="h-4 w-4" />}
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={busy || needsTotp}
            required
          />

          {needsTotp && (
            <div className="rounded-card border border-mint/30 bg-mint/6 p-4">
              <div className="mb-2.5 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-mint" />
                <p className="text-sm font-medium text-ink">Two-factor required</p>
              </div>
              <Field
                id="totp"
                label="Authenticator code"
                icon={<KeyRound className="h-4 w-4" />}
                type="text"
                value={totpCode}
                onChange={(v) => setTotpCode(v.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                autoComplete="one-time-code"
                inputMode="numeric"
                disabled={busy}
                autoFocus
                required
              />
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-mint text-sm font-semibold text-mint-ink transition hover:bg-mint-hi disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {needsTotp ? 'Verify & sign in' : 'Sign in'}
          </button>

          {needsTotp && (
            <button
              type="button"
              onClick={() => {
                setNeedsTotp(false);
                setTotpCode('');
                setError(null);
              }}
              className="w-full text-center text-xs text-ink-dim hover:text-ink"
            >
              Use a different account
            </button>
          )}
        </form>

        <p className="mt-8 text-center text-xs text-ink-faint">
          Patient accounts sign in through the mobile app.
        </p>
      </div>
    </div>
  );
}

interface FieldProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: 'numeric';
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
}

function Field({ id, label, icon, value, onChange, ...rest }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="label-micro mb-1.5 block">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint">
          {icon}
        </span>
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 w-full rounded-lg border border-edge bg-surface pl-10 pr-3.5 text-sm text-ink placeholder:text-ink-faint focus:border-mint/50 disabled:opacity-60"
          {...rest}
        />
      </div>
    </div>
  );
}
