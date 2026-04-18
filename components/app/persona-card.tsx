import { cn } from '@/lib/shadcn/utils';

const TRAIT_LABELS: Record<string, string> = {
  O: 'OTW',
  C: 'SUM',
  E: 'EKS',
  A: 'UGO',
  N: 'NEU',
};

export type PersonaSnapshot = {
  uid?: string;
  horizon_years?: number;
  target_age?: number;
  erikson_stage?: string;
  ocean_t?: Record<string, number>;
  ocean_described?: string;
};

function PixelBar({ label, value }: { label: string; value: number }) {
  const t = Math.max(20, Math.min(80, value));
  const pct = ((t - 20) / 60) * 100;
  return (
    <div className="flex w-full items-center gap-2 font-mono text-[11px] tracking-[0.12em] uppercase">
      <span className="w-10 shrink-0 text-[color:var(--color-mint)]">{label}</span>
      <div className="relative h-3 flex-1 border border-[color:var(--color-mint)]/35 bg-[color:var(--color-soft-purple)]">
        <div className="h-full bg-[color:var(--color-coral)]" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right text-[color:var(--muted-foreground)]">{Math.round(t)}</span>
    </div>
  );
}

export function PersonaCard({
  snapshot,
  className,
}: {
  snapshot: PersonaSnapshot | null;
  className?: string;
}) {
  if (!snapshot?.ocean_t) {
    return (
      <div
        className={cn(
          'rounded-none border border-dashed border-[color:var(--color-mint)]/30 bg-[color:var(--color-soft-purple)]/40 px-4 py-6 text-center font-mono text-xs tracking-[0.2em] text-[color:var(--muted-foreground)] uppercase',
          className
        )}
      >
        {'> BRAK DANYCH PERSONY — WYKONAJ ONBOARDING LUB INGEST'}
      </div>
    );
  }

  const ocean = snapshot.ocean_t;

  return (
    <div
      className={cn(
        'border border-[color:var(--color-mint)]/40 bg-[color:var(--color-soft-purple)]/50 px-4 py-5 font-mono',
        className
      )}
    >
      <div className="mb-3 text-[11px] tracking-[0.35em] text-[color:var(--color-mint)] uppercase opacity-80">
        {'> SNAPSHOT · PRZYSZŁE JA'}
      </div>
      <div className="mb-2 text-[10px] tracking-[0.2em] text-[color:var(--muted-foreground)] uppercase">
        {snapshot.horizon_years != null && (
          <>
            HORYZONT +{snapshot.horizon_years} LAT · WIEK {snapshot.target_age ?? '?'} LAT
          </>
        )}
      </div>
      {snapshot.erikson_stage && (
        <p className="mb-4 text-[12px] leading-relaxed text-[color:var(--foreground)]">
          {snapshot.erikson_stage}
        </p>
      )}
      <div className="flex flex-col gap-2">
        {(['O', 'C', 'E', 'A', 'N'] as const).map((k) => (
          <PixelBar key={k} label={TRAIT_LABELS[k] ?? k} value={ocean[k] ?? 50} />
        ))}
      </div>
      {snapshot.ocean_described && (
        <p className="mt-4 border-t border-[color:var(--color-mint)]/20 pt-3 text-[11px] leading-relaxed text-[color:var(--muted-foreground)]">
          {snapshot.ocean_described}
        </p>
      )}
    </div>
  );
}
