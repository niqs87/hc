'use client';

import { useState } from 'react';
import { cn } from '@/lib/shadcn/utils';

type AuthScreenProps = {
  onSession: (data: { uid: string; access_token: string; email: string }) => void;
};

export function AuthScreen({ onSession }: AuthScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(path: 'register' | 'login') {
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/jutra/auth/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        detail?: string | string[];
        uid?: string;
        access_token?: string;
        email?: string;
      };
      if (!res.ok) {
        const d = data.detail;
        const msg =
          typeof d === 'string'
            ? d
            : Array.isArray(d)
              ? d.map((x) => (typeof x === 'object' && x && 'msg' in x ? String((x as { msg: string }).msg) : String(x))).join(', ')
              : data.error || `Błąd ${res.status}`;
        setError(msg);
        return;
      }
      if (data.uid && data.access_token && data.email) {
        onSession({ uid: data.uid, access_token: data.access_token, email: data.email });
      } else {
        setError('Nieprawidłowa odpowiedź serwera');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sieć niedostępna');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="relative grid min-h-svh grid-cols-1 place-content-center px-6 py-24">
      <div className="mx-auto w-full max-w-sm space-y-6">
        <h1
          className="text-center font-mono text-5xl tracking-[0.18em] text-[color:var(--color-coral)] uppercase md:text-6xl"
          style={{ textShadow: '0 0 28px rgba(255, 142, 114, 0.5)' }}
        >
          [JUTRA]
        </h1>
        <p className="text-center text-sm text-muted-foreground">
          Zaloguj się lub utwórz konto — potrzebujemy tylko e-maila i hasła (min. 8 znaków).
        </p>
        <div className="space-y-3">
          <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground">
            E-mail
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={cn(
                'mt-1 w-full rounded-md border border-border bg-background/80 px-3 py-2 text-sm',
                'outline-none focus:border-[color:var(--color-mint)]'
              )}
            />
          </label>
          <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Hasło
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cn(
                'mt-1 w-full rounded-md border border-border bg-background/80 px-3 py-2 text-sm',
                'outline-none focus:border-[color:var(--color-mint)]'
              )}
            />
          </label>
        </div>
        {error ? (
          <p className="text-center text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            disabled={pending}
            onClick={() => void submit('login')}
            className={cn('pixel-btn clip-pixel-4 cursor-pointer px-6 py-2 text-sm disabled:opacity-50')}
          >
            Zaloguj
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void submit('register')}
            className={cn(
              'rounded-md border border-[color:var(--color-mint)]/50 px-6 py-2 text-sm text-[color:var(--color-mint)]',
              'hover:bg-[color:var(--color-mint)]/10 disabled:opacity-50'
            )}
          >
            Zarejestruj
          </button>
        </div>
      </div>
    </main>
  );
}
