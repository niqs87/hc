'use client';

import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/shadcn/utils';
import { useJutraPrefs } from '@/components/app/jutra-prefs-context';
import { PersonaCard, type PersonaSnapshot } from '@/components/app/persona-card';
import { PhotoUploadStep } from '@/components/app/photo-upload-step';

export function PreSessionView({
  startButtonText,
  onBack,
  onStartVoice,
  showBackButton = true,
}: {
  startButtonText: string;
  onBack: () => void;
  onStartVoice: () => void;
  /** When false (e.g. settings overlay), hide the welcome-flow back control. */
  showBackButton?: boolean;
}) {
  const {
    uid,
    displayName,
    setDisplayName,
    baseAge,
    setBaseAge,
    gender,
    setGender,
    setAgedPhotoUrl,
    ready,
  } = useJutraPrefs();
  const [persona, setPersona] = useState<PersonaSnapshot | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);

  const refreshPersona = useCallback(async () => {
    if (!uid) return;
    try {
      const res = await fetch(
        `/api/jutra/persona?uid=${encodeURIComponent(uid)}`,
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
  }, [uid]);

  useEffect(() => {
    if (!ready || !uid) return;
    void (async () => {
      try {
        const res = await fetch('/api/jutra/seed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid,
            display_name: displayName,
            base_age: baseAge,
            // Only send an explicit value when the user overrode it; "u" lets
            // the backend auto-detect from the display name.
            gender: gender === 'u' ? undefined : gender,
          }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          setSeedError((j as { error?: string }).error ?? `seed ${res.status}`);
        } else {
          setSeedError(null);
          // Backend returns the resolved (stored or inferred) gender. Adopt
          // it so the LiveKit token metadata carries the real value instead
          // of the default "u" — that's what drives voice selection in the
          // agent worker.
          const body = (await res.json().catch(() => null)) as
            | { gender?: string }
            | null;
          if (body && (body.gender === 'f' || body.gender === 'm' || body.gender === 'u')) {
            if (body.gender !== gender) setGender(body.gender);
          }
        }
      } catch (e) {
        setSeedError(e instanceof Error ? e.message : 'seed failed');
      }
      await refreshPersona();
    })();
  }, [ready, uid, displayName, baseAge, gender, setGender, refreshPersona]);

  return (
    <div className="flex flex-col items-center px-6 pb-28 text-center">
      <div className="w-full max-w-xl space-y-8" style={{ animation: 'fadeInUp 0.8s ease-out both' }}>
        <div>
          <h2 className="font-mono text-2xl tracking-[0.12em] text-[color:var(--color-coral)] uppercase md:text-3xl">
            Konfiguracja portalu
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[color:var(--muted-foreground)]">
            Podaj imię i wiek — resztę poznasz w rozmowie głosowej z przyszłym sobą.
            Opcjonalnie dodaj zdjęcie, żeby zobaczyć, jak mógłbyś wyglądać trochę
            starszy.
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

        <label className="block text-left font-mono text-[11px] tracking-[0.25em] text-[color:var(--color-mint)] uppercase opacity-80">
          Ile masz lat?
          <input
            type="number"
            min={10}
            max={80}
            value={baseAge}
            onChange={(e) => setBaseAge(parseInt(e.target.value, 10) || 15)}
            className="mt-2 w-full border border-[color:var(--color-mint)]/40 bg-[color:var(--color-soft-purple)]/50 px-3 py-2 font-mono text-sm text-[color:var(--foreground)] outline-none focus:border-[color:var(--color-coral)]"
          />
        </label>

        <fieldset className="block text-left">
          <legend className="font-mono text-[11px] tracking-[0.25em] text-[color:var(--color-mint)] uppercase opacity-80">
            Rodzaj
          </legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(
              [
                { value: 'f' as const, label: 'Kobieta' },
                { value: 'm' as const, label: 'Mężczyzna' },
                { value: 'u' as const, label: 'Neutralnie' },
              ]
            ).map((opt) => (
              <label
                key={opt.value}
                className={cn(
                  'cursor-pointer border px-3 py-2 text-center font-mono text-xs uppercase tracking-[0.15em]',
                  gender === opt.value
                    ? 'border-[color:var(--color-coral)] bg-[color:var(--color-coral)]/15 text-[color:var(--foreground)]'
                    : 'border-[color:var(--color-mint)]/40 bg-[color:var(--color-soft-purple)]/50 text-[color:var(--muted-foreground)] hover:border-[color:var(--color-mint)]',
                )}
              >
                <input
                  type="radio"
                  name="gender"
                  value={opt.value}
                  checked={gender === opt.value}
                  onChange={() => setGender(opt.value)}
                  className="sr-only"
                />
                {opt.label}
              </label>
            ))}
          </div>
          <p className="mt-2 font-mono text-[10px] tracking-[0.1em] text-[color:var(--muted-foreground)]/70">
            Wpływa na głos i formy gramatyczne (np. „myślałem / myślałam”).
          </p>
        </fieldset>

        {uid && ready && (
          <PhotoUploadStep uid={uid} onAgedPhotoReady={setAgedPhotoUrl} />
        )}

        <PersonaCard snapshot={persona} />

        <p className="text-center text-[10px] text-muted-foreground/60">jutra · symulacja AI</p>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          {showBackButton && (
            <button
              type="button"
              onClick={onBack}
              className="font-mono text-xs tracking-[0.25em] text-[color:var(--muted-foreground)] uppercase underline-offset-4 hover:underline"
            >
              Wróć
            </button>
          )}
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
