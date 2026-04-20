'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, type MotionProps, motion } from 'motion/react';
import { useAgent, useSessionContext, useSessionMessages } from '@livekit/components-react';
import {
  AgentChatTranscript,
  type ChatHistoryTurn,
} from '@/components/agents-ui/agent-chat-transcript';
import { useJutraPrefs } from '@/components/app/jutra-prefs-context';
import {
  AgentControlBar,
  type AgentControlBarControls,
} from '@/components/agents-ui/agent-control-bar';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { Settings } from 'lucide-react';
import { cn } from '@/lib/shadcn/utils';
import { TileLayout } from './tile-view';

const MotionMessage = motion.create(Shimmer);

const BOTTOM_VIEW_MOTION_PROPS: MotionProps = {
  variants: {
    visible: {
      opacity: 1,
      translateY: '0%',
    },
    hidden: {
      opacity: 0,
      translateY: '100%',
    },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
  transition: {
    duration: 0.3,
    delay: 0.5,
    ease: 'easeOut',
  },
};

const CHAT_MOTION_PROPS: MotionProps = {
  variants: {
    hidden: {
      opacity: 0,
      transition: {
        ease: 'easeOut',
        duration: 0.3,
      },
    },
    visible: {
      opacity: 1,
      transition: {
        delay: 0.2,
        ease: 'easeOut',
        duration: 0.3,
      },
    },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
};

const SHIMMER_MOTION_PROPS: MotionProps = {
  variants: {
    visible: {
      opacity: 1,
      transition: {
        ease: 'easeIn',
        duration: 0.5,
        delay: 0.8,
      },
    },
    hidden: {
      opacity: 0,
      transition: {
        ease: 'easeIn',
        duration: 0.5,
        delay: 0,
      },
    },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
};

interface FadeProps {
  top?: boolean;
  bottom?: boolean;
  className?: string;
}

export function Fade({ top = false, bottom = false, className }: FadeProps) {
  return (
    <div
      className={cn(
        'pointer-events-none h-4',
        top && '[background:linear-gradient(to_bottom,var(--background),transparent)]',
        bottom && '[background:linear-gradient(to_top,var(--background),transparent)]',
        className
      )}
    />
  );
}

function PixelStarfield() {
  const stars = useMemo(() => {
    return Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: i % 7 === 0 ? 3 : 2,
      delay: Math.random() * 2,
      duration: 1.8 + Math.random() * 2,
      color: i % 9 === 0 ? 'var(--color-coral)' : '#FFFFFF',
    }));
  }, []);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {stars.map((s) => (
        <span
          key={s.id}
          className="absolute block"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            background: s.color,
            opacity: 0.6,
            animation: `pixelTwinkle ${s.duration}s ease-in-out ${s.delay}s infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}

export interface AgentSessionView_01Props {
  /**
   * Message shown above the controls before the first chat message is sent.
   *
   * @default 'Agent is listening, ask it a question'
   */
  preConnectMessage?: string;
  /**
   * Enables or disables the chat toggle and transcript input controls.
   *
   * @default true
   */
  supportsChatInput?: boolean;
  /**
   * Enables or disables camera controls in the bottom control bar.
   *
   * @default true
   */
  supportsVideoInput?: boolean;
  /**
   * Enables or disables screen sharing controls in the bottom control bar.
   *
   * @default true
   */
  supportsScreenShare?: boolean;
  /**
   * Shows a pre-connect buffer state with a shimmer message before messages appear.
   *
   * @default true
   */
  isPreConnectBufferEnabled?: boolean;

  /** Selects the visualizer style rendered in the main tile area. */
  audioVisualizerType?: 'bar' | 'wave' | 'grid' | 'radial' | 'aura';
  /** Primary hex color used by supported audio visualizer variants. */
  audioVisualizerColor?: `#${string}`;
  /** Hue shift intensity used by certain visualizers. */
  audioVisualizerColorShift?: number;
  /** Number of bars to render when `audioVisualizerType` is `bar`. */
  audioVisualizerBarCount?: number;
  /** Number of rows in the visualizer when `audioVisualizerType` is `grid`. */
  audioVisualizerGridRowCount?: number;
  /** Number of columns in the visualizer when `audioVisualizerType` is `grid`. */
  audioVisualizerGridColumnCount?: number;
  /** Number of radial bars when `audioVisualizerType` is `radial`. */
  audioVisualizerRadialBarCount?: number;
  /** Base radius of the radial visualizer when `audioVisualizerType` is `radial`. */
  audioVisualizerRadialRadius?: number;
  /** Stroke width of the wave path when `audioVisualizerType` is `wave`. */
  audioVisualizerWaveLineWidth?: number;
  /**
   * Imagen-generated "slightly older me" photo of the user. When provided, it
   * is rendered inside the portal frame as the agent's "face" during the
   * session.
   */
  futureSelfPhotoUrl?: string | null;
  /** Opens first-run portal settings (name, age, photo) from the session chrome. */
  onOpenPortalSettings?: () => void;
  /** Optional class name merged onto the outer `<section>` container. */
  className?: string;
}

export function AgentSessionView_01({
  preConnectMessage = 'Agent is listening, ask it a question',
  supportsChatInput = true,
  supportsVideoInput = true,
  supportsScreenShare = true,
  isPreConnectBufferEnabled = true,

  audioVisualizerType,
  audioVisualizerColor,
  audioVisualizerColorShift,
  audioVisualizerBarCount,
  audioVisualizerGridRowCount,
  audioVisualizerGridColumnCount,
  audioVisualizerRadialBarCount,
  audioVisualizerRadialRadius,
  audioVisualizerWaveLineWidth,
  futureSelfPhotoUrl,
  onOpenPortalSettings,
  ref,
  className,
  ...props
}: React.ComponentProps<'section'> & AgentSessionView_01Props) {
  const session = useSessionContext();
  const { messages } = useSessionMessages(session);
  const [chatOpen, setChatOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { state: agentState } = useAgent();
  const { uid } = useJutraPrefs();
  const [history, setHistory] = useState<ChatHistoryTurn[]>([]);
  const historyFetchedRef = useRef(false);

  useEffect(() => {
    if (!uid || historyFetchedRef.current) return;
    historyFetchedRef.current = true;
    void (async () => {
      try {
        const res = await fetch(
          `/api/jutra/history?uid=${encodeURIComponent(uid)}&limit=200`,
          { cache: 'no-store' }
        );
        if (!res.ok) return;
        const data = (await res.json()) as {
          turns?: { role?: string; text?: string; ts?: string }[];
        };
        const turns = (data.turns ?? [])
          .filter(
            (t): t is { role: 'user' | 'assistant'; text: string; ts?: string } =>
              (t.role === 'user' || t.role === 'assistant') &&
              typeof t.text === 'string' &&
              t.text.trim().length > 0
          )
          .map((t) => ({ role: t.role, text: t.text, ts: t.ts }));
        setHistory(turns);
      } catch {
        // non-fatal
      }
    })();
  }, [uid]);

  useEffect(() => {
    if (futureSelfPhotoUrl) {
      // eslint-disable-next-line no-console
      console.info('[jutra] session: future-self photo attached', {
        url: futureSelfPhotoUrl,
      });
    } else {
      // eslint-disable-next-line no-console
      console.info('[jutra] session: no future-self photo available');
    }
  }, [futureSelfPhotoUrl]);

  const controls: AgentControlBarControls = {
    leave: true,
    microphone: true,
    chat: supportsChatInput,
    camera: supportsVideoInput,
    screenShare: supportsScreenShare,
  };

  useEffect(() => {
    const lastMessage = messages.at(-1);
    const lastMessageIsLocal = lastMessage?.from?.isLocal === true;

    if (scrollAreaRef.current && lastMessageIsLocal) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <section
      ref={ref}
      className={cn(
        'relative z-10 h-full w-full overflow-hidden',
        'bg-[radial-gradient(ellipse_at_top,rgba(74,45,122,0.55),transparent_60%),linear-gradient(180deg,#0D0A1F_0%,#1A0D2E_40%,#2D1B4E_100%)]',
        className
      )}
      {...props}
    >
      <PixelStarfield />
      {onOpenPortalSettings && (
        <button
          type="button"
          onClick={onOpenPortalSettings}
          className="absolute right-4 top-4 z-[100] flex h-11 w-11 items-center justify-center border-2 border-[color:var(--color-coral)] bg-[color:var(--color-midnight)]/80 text-[color:var(--color-coral)] shadow-[4px_4px_0_var(--color-dark-coral)] transition-colors hover:bg-[color:var(--color-soft-purple)]/50"
          aria-label="Ustawienia portalu"
          title="Ustawienia portalu"
        >
          <Settings className="size-5" strokeWidth={2} />
        </button>
      )}
      <Fade top className="absolute inset-x-4 top-0 z-10 h-40" />
      {/* transcript */}

      <div className="absolute top-0 bottom-[180px] flex w-full flex-col md:bottom-[220px]">
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              {...CHAT_MOTION_PROPS}
              className="flex h-full min-h-0 w-full flex-col gap-4 space-y-3 transition-opacity duration-300 ease-out"
            >
              <AgentChatTranscript
                agentState={agentState}
                messages={messages}
                history={history}
                className="mx-auto w-full max-w-2xl [&_.is-user>div]:rounded-[22px] [&>div>div]:px-4 [&>div>div]:pt-40 md:[&>div>div]:px-6"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* Tile layout */}
      <TileLayout
        chatOpen={chatOpen}
        audioVisualizerType={audioVisualizerType}
        audioVisualizerColor={audioVisualizerColor}
        audioVisualizerColorShift={audioVisualizerColorShift}
        audioVisualizerBarCount={audioVisualizerBarCount}
        audioVisualizerRadialBarCount={audioVisualizerRadialBarCount}
        audioVisualizerRadialRadius={audioVisualizerRadialRadius}
        audioVisualizerGridRowCount={audioVisualizerGridRowCount}
        audioVisualizerGridColumnCount={audioVisualizerGridColumnCount}
        audioVisualizerWaveLineWidth={audioVisualizerWaveLineWidth}
        futureSelfPhotoUrl={futureSelfPhotoUrl}
      />
      {/* Bottom */}
      <motion.div
        {...BOTTOM_VIEW_MOTION_PROPS}
        className="absolute inset-x-3 bottom-0 z-50 md:inset-x-12"
      >
        {/* Pre-connect message */}
        {isPreConnectBufferEnabled && (
          <AnimatePresence>
            {messages.length === 0 && (
              <MotionMessage
                key="pre-connect-message"
                duration={2}
                aria-hidden={messages.length > 0}
                {...SHIMMER_MOTION_PROPS}
                className="pointer-events-none mx-auto block w-full max-w-2xl pb-4 text-center font-mono text-[16px] tracking-[0.08em] text-[color:var(--color-mint)]"
              >
                {preConnectMessage}
              </MotionMessage>
            )}
          </AnimatePresence>
        )}
        <div className="relative mx-auto max-w-2xl pb-3 md:pb-12">
          <p className="pb-2 text-center text-[10px] text-muted-foreground/60">jutra · symulacja AI</p>
          <AgentControlBar
            variant="livekit"
            controls={controls}
            isChatOpen={chatOpen}
            isConnected={session.isConnected}
            onDisconnect={session.end}
            onIsChatOpenChange={setChatOpen}
          />
        </div>
      </motion.div>
    </section>
  );
}
