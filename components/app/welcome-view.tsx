import { cn } from '@/lib/shadcn/utils';

function PixelLogo() {
  return (
    <svg
      width="140"
      height="170"
      viewBox="0 0 70 85"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
      aria-hidden
      className="mb-8"
      style={{
        animation: 'avatarFloat 3s ease-in-out infinite, avatarGlow 2s ease-in-out infinite',
      }}
    >
      {/* Hourglass top — mint */}
      <g fill="#72FFA9">
        <rect x="18" y="4" width="34" height="4" />
        <rect x="18" y="8" width="4" height="4" />
        <rect x="48" y="8" width="4" height="4" />
        <rect x="22" y="12" width="4" height="4" />
        <rect x="44" y="12" width="4" height="4" />
        <rect x="26" y="16" width="4" height="4" />
        <rect x="40" y="16" width="4" height="4" />
        <rect x="30" y="20" width="10" height="4" />
      </g>

      {/* Falling dot (animated) — coral */}
      <rect x="32" y="24" width="6" height="6" fill="#FF8E72">
        <animate attributeName="y" values="24;40;24" dur="2.2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0.5;1" dur="2.2s" repeatCount="indefinite" />
      </rect>

      {/* Waist */}
      <rect x="30" y="28" width="10" height="4" fill="#72FFA9" opacity="0.6" />

      {/* Head (coral — future self) */}
      <g fill="#FF8E72">
        <rect x="28" y="44" width="14" height="4" />
        <rect x="26" y="48" width="18" height="4" />
        <rect x="24" y="52" width="22" height="8" />
        <rect x="26" y="60" width="18" height="2" />
      </g>

      {/* Eyes (midnight gaps) */}
      <g fill="#2D1B4E">
        <rect x="30" y="54" width="2" height="2" />
        <rect x="38" y="54" width="2" height="2" />
      </g>

      {/* Shoulders */}
      <g fill="#FF8E72">
        <rect x="14" y="64" width="42" height="4" />
        <rect x="10" y="68" width="50" height="4" />
        <rect x="8" y="72" width="54" height="10" />
      </g>
    </svg>
  );
}

function PixelDivider() {
  const dots = Array.from({ length: 18 });
  return (
    <div className="mt-8 flex items-center justify-center gap-2">
      {dots.map((_, i) => {
        const palette = ['#FF8E72', 'transparent', '#72FFA9', 'transparent'];
        const color = palette[i % palette.length];
        return <span key={i} className="inline-block size-1" style={{ background: color }} />;
      })}
    </div>
  );
}

interface WelcomeViewProps {
  startButtonText: string;
  /** First step: open preflight (horizon / onboarding / ingest) before LiveKit. */
  onBeginPreflight: () => void;
}

export const WelcomeView = ({
  startButtonText,
  onBeginPreflight,
  ref,
}: React.ComponentProps<'div'> & WelcomeViewProps) => {
  return (
    <div ref={ref}>
      <section
        className="flex flex-col items-center justify-center px-6 text-center"
        style={{ animation: 'fadeInUp 0.8s ease-out both' }}
      >
        <PixelLogo />

        <h1
          className="font-mono text-5xl leading-none tracking-[0.08em] uppercase md:text-7xl"
          style={{
            background: 'linear-gradient(180deg, #FF8E72 0%, #FFD7C4 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            textShadow: '0 0 24px rgba(255, 142, 114, 0.3)',
          }}
        >
          Porozmawiaj
          <br />z przyszłym sobą
        </h1>

        <p className="mt-6 max-w-[560px] text-base leading-relaxed text-[color:var(--muted-foreground)]">
          Jutra to bezpieczna przestrzeń, gdzie możesz porozmawiać z AI, które wciela się w Ciebie
          za 10 lat. Usiądź, oddychaj, odkryj kim będziesz.
        </p>

        <PixelDivider />

        <button
          type="button"
          onClick={onBeginPreflight}
          className={cn('pixel-btn clip-pixel-4 mt-10 cursor-pointer')}
        >
          {startButtonText}
        </button>

        <span className="mt-5 font-mono text-xs tracking-[0.25em] text-[color:var(--color-mint)] uppercase opacity-70">
          {'> INICJALIZACJA PORTALU CZASU…'}
        </span>
      </section>

      <div className="fixed bottom-6 left-0 flex w-full items-center justify-center px-6">
        <p className="max-w-prose text-center font-mono text-[11px] tracking-[0.2em] text-[color:var(--muted-foreground)] uppercase opacity-60">
          Jutra © 2034 · AI to wyobrażenie Ciebie, nie przewidywanie przyszłości
        </p>
      </div>
    </div>
  );
};
