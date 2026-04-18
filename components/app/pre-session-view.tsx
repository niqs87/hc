'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/shadcn/utils';
import { useJutraPrefs } from '@/components/app/jutra-prefs-context';
import { PersonaCard, type PersonaSnapshot } from '@/components/app/persona-card';

type OnboardingState =
  | { status: 'idle' }
  | { status: 'active'; sessionId: string; question: string; log: string[] };

export function PreSessionView({
  horizons,
  startButtonText,
  onBack,
  onStartVoice,
}: {
  horizons: readonly number[];
  startButtonText: string;
  onBack: () => void;
  onStartVoice: () => void;
}) {
  const { uid, horizon, setHorizon, displayName, setDisplayName, ready } = useJutraPrefs();
  const [persona, setPersona] = useState<PersonaSnapshot | null>(null);
  const [ingestText, setIngestText] = useState('');
  const [ingestBusy, setIngestBusy] = useState(false);
  const [onb, setOnb] = useState<OnboardingState>({ status: 'idle' });
  const [onbInput, setOnbInput] = useState('');
  const [onbBusy, setOnbBusy] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  const seededRef = useRef(false);

  const refreshPersona = useCallback(async () => {
    if (!uid) return;
    try {
      const res = await fetch(
        `/api/jutra/persona?uid=${encodeURIComponent(uid)}&delta=${encodeURIComponent(String(horizon))}`,
        { cache: 'no-store' }
      );
      const data = (await res.json()) as PersonaSnapshot & { error?: string };
      if (res.ok) {
        setPersona(data);
      } else {
        setPersona(null);
      }
    } catch {
      setPersona(null);
    }
  }, [uid, horizon]);

  useEffect(() => {
    if (!ready || !uid) return;
    void (async () => {
      if (!seededRef.current) {
        seededRef.current = true;
        try {
          const res = await fetch('/api/jutra/seed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uid,
              display_name: displayName,
              base_age: 15,
            }),
          });
          if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            setSeedError((j as { error?: string }).error ?? `seed ${res.status}`);
          } else {
            setSeedError(null);
          }
        } catch (e) {
          setSeedError(e instanceof Error ? e.message : 'seed failed');
        }
      }
      await refreshPersona();
    })();
  }, [ready, uid, horizon, refreshPersona]);

  const runIngest = async () => {
    const lines = ingestText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 10) {
      return;
    }
    setIngestBusy(true);
    try {
      const res = await fetch('/api/jutra/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          posts: lines,
          platform: 'manual',
        }),
      });
      if (res.ok) {
        setIngestText('');
        await refreshPersona();
      }
    } finally {
      setIngestBusy(false);
    }
  };

  const startOnboarding = async () => {
    if (!uid) return;
    setOnbBusy(true);
    try {
      const res = await fetch('/api/jutra/onboarding/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid }),
      });
      const data = (await res.json()) as { session_id?: string; question?: string; error?: string };
      if (!res.ok) {
        setOnb({ status: 'idle' });
        return;
      }
      if (data.session_id && data.question) {
        setOnb({
          status: 'active',
          sessionId: data.session_id,
          question: data.question,
          log: [`> ${data.question}`],
        });
        setOnbInput('');
      }
    } finally {
      setOnbBusy(false);
    }
  };

  const onboardingTurn = async () => {
    if (onb.status !== 'active' || !onbInput.trim()) return;
    const msg = onbInput.trim();
    setOnbBusy(true);
    try {
      const res = await fetch('/api/jutra/onboarding/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: onb.sessionId,
          message: msg,
        }),
      });
      const data = (await res.json()) as {
        next_question?: string | null;
        completed?: boolean;
        acknowledgment?: string;
        error?: string;
      };
      setOnb((prev) => {
        if (prev.status !== 'active') return prev;
        const log = [...prev.log, `[TY] ${msg}`];
        if (data.completed) {
          if (data.acknowledgment) log.push(`> ${data.acknowledgment}`);
          return { status: 'idle' };
        }
        const nq = data.next_question;
        if (nq) {
          log.push(`> ${nq}`);
          return { ...prev, sessionId: prev.sessionId, question: nq, log };
        }
        return { ...prev, log };
      });
      setOnbInput('');
      await refreshPersona();
    } finally {
      setOnbBusy(false);
    }
  };

  const lineCount = ingestText.split(/\r?\n/).filter((l) => l.trim().length > 0).length;

  return (
    <div className="flex flex-col items-center px-6 pb-28 text-center">
      <div className="w-full max-w-xl space-y-8" style={{ animation: 'fadeInUp 0.8s ease-out both' }}>
        <div>
          <h2 className="font-mono text-2xl tracking-[0.12em] text-[color:var(--color-coral)] uppercase md:text-3xl">
            Konfiguracja portalu
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[color:var(--muted-foreground)]">
            Wybierz horyzont, opcjonalnie wklej posty i/lub przejdź krótki onboarding — potem wejdź do rozmowy
            głosowej z tym samym profilem co backend.
          </p>
        </div>

        {seedError && (
          <p className="font-mono text-xs text-[color:var(--color-coral)]">{'> '}{seedError}</p>
        )}

        <label className="block text-left font-mono text-[11px] tracking-[0.25em] text-[color:var(--color-mint)] uppercase opacity-80">
          Imię / pseudonim
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-2 w-full border border-[color:var(--color-mint)]/40 bg-[color:var(--color-soft-purple)]/50 px-3 py-2 font-mono text-sm text-[color:var(--foreground)] outline-none focus:border-[color:var(--color-coral)]"
            autoComplete="nickname"
          />
        </label>

        <div>
          <p className="mb-3 font-mono text-[11px] tracking-[0.3em] text-[color:var(--color-mint)] uppercase opacity-70">
            Horyzont czasu
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {horizons.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHorizon(h)}
                className={cn(
                  'clip-pixel-4 border px-4 py-2 font-mono text-xs tracking-[0.15em] uppercase transition-colors',
                  h === horizon
                    ? 'border-[color:var(--color-mint)] bg-[color:var(--color-mint)]/20 text-[color:var(--color-mint)]'
                    : 'border-[color:var(--color-mint)]/35 text-[color:var(--muted-foreground)] hover:border-[color:var(--color-coral)]/60'
                )}
              >
                +{h} lat
              </button>
            ))}
          </div>
        </div>

        <div className="text-left">
          <p className="mb-2 font-mono text-[11px] tracking-[0.25em] text-[color:var(--color-mint)] uppercase opacity-70">
            Opcja A — onboarding (tekst)
          </p>
          {onb.status === 'idle' ? (
            <button
              type="button"
              disabled={!ready || !uid || onbBusy}
              onClick={() => void startOnboarding()}
              className="pixel-btn clip-pixel-4 cursor-pointer px-4 py-2 font-mono text-xs uppercase disabled:opacity-40"
            >
              Rozpocznij poznawanie
            </button>
          ) : (
            <div className="space-y-3 border border-[color:var(--color-mint)]/30 bg-[color:var(--color-soft-purple)]/40 p-4">
              <div className="max-h-40 overflow-y-auto text-left font-mono text-[13px] leading-relaxed text-[color:var(--foreground)] whitespace-pre-wrap">
                {onb.log.join('\n')}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={onbInput}
                  onChange={(e) => setOnbInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void onboardingTurn();
                    }
                  }}
                  className="min-w-0 flex-1 border border-[color:var(--color-mint)]/40 bg-[#0D0A1F] px-3 py-2 font-mono text-sm text-[color:var(--color-light-mint)] outline-none"
                  placeholder="Twoja odpowiedź…"
                />
                <button
                  type="button"
                  disabled={onbBusy}
                  onClick={() => void onboardingTurn()}
                  className="pixel-btn clip-pixel-4 shrink-0 cursor-pointer px-4 py-2 font-mono text-xs uppercase"
                >
                  Wyślij
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="text-left">
          <p className="mb-2 font-mono text-[11px] tracking-[0.25em] text-[color:var(--color-mint)] uppercase opacity-70">
            Opcja B — wklej posty (min. 10 linii)
          </p>
          <textarea
            value={ingestText}
            onChange={(e) => setIngestText(e.target.value)}
            rows={8}
            className="w-full resize-y border border-[color:var(--color-mint)]/40 bg-[#0D0A1F] px-3 py-2 font-mono text-[13px] text-[color:var(--color-light-mint)] outline-none focus:border-[color:var(--color-coral)]/70"
            placeholder={'Każda linia = jeden post…'}
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] tracking-[0.2em] text-[color:var(--muted-foreground)] uppercase">
              Linii: {lineCount}
            </span>
            <button
              type="button"
              disabled={lineCount < 10 || ingestBusy}
              onClick={() => void runIngest()}
              className="pixel-btn clip-pixel-4 cursor-pointer px-4 py-2 font-mono text-xs uppercase disabled:opacity-40"
            >
              Wyślij do analizy
            </button>
          </div>
        </div>

        <PersonaCard snapshot={persona} />

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onBack}
            className="font-mono text-xs tracking-[0.25em] text-[color:var(--muted-foreground)] uppercase underline-offset-4 hover:underline"
          >
            Wróć
          </button>
          <button
            type="button"
            disabled={!ready || !uid}
            onClick={onStartVoice}
            className={cn('pixel-btn clip-pixel-4 cursor-pointer px-8 py-3 font-mono text-sm uppercase disabled:opacity-40')}
          >
            {startButtonText}
          </button>
        </div>
      </div>
    </div>
  );
}
