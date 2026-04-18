import React, { useMemo } from 'react';
import { Track } from 'livekit-client';
import { AnimatePresence, type MotionProps, motion } from 'motion/react';
import {
  type TrackReference,
  VideoTrack,
  useLocalParticipant,
  useTracks,
  useVoiceAssistant,
} from '@livekit/components-react';
import { cn } from '@/lib/shadcn/utils';
import { AudioVisualizer } from './audio-visualizer';

function PortalFrame({ visible, size = 360 }: { visible: boolean; size?: number }) {
  if (!visible) return null;
  const corner = 18;
  const thick = 3;
  const mint = 'var(--color-mint)';
  const coral = 'var(--color-coral)';
  const base = 'pointer-events-none absolute block';
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ width: size, height: size }}
    >
      {/* Corner brackets — mint on top-left / bottom-right, coral on top-right / bottom-left */}
      {/* top-left */}
      <span
        className={base}
        style={{
          top: 0,
          left: 0,
          width: corner,
          height: thick,
          background: mint,
          boxShadow: '0 0 10px rgba(114,255,169,0.6)',
        }}
      />
      <span
        className={base}
        style={{
          top: 0,
          left: 0,
          width: thick,
          height: corner,
          background: mint,
          boxShadow: '0 0 10px rgba(114,255,169,0.6)',
        }}
      />
      {/* top-right */}
      <span
        className={base}
        style={{
          top: 0,
          right: 0,
          width: corner,
          height: thick,
          background: coral,
          boxShadow: '0 0 10px rgba(255,142,114,0.5)',
        }}
      />
      <span
        className={base}
        style={{
          top: 0,
          right: 0,
          width: thick,
          height: corner,
          background: coral,
          boxShadow: '0 0 10px rgba(255,142,114,0.5)',
        }}
      />
      {/* bottom-left */}
      <span
        className={base}
        style={{
          bottom: 0,
          left: 0,
          width: corner,
          height: thick,
          background: coral,
          boxShadow: '0 0 10px rgba(255,142,114,0.5)',
        }}
      />
      <span
        className={base}
        style={{
          bottom: 0,
          left: 0,
          width: thick,
          height: corner,
          background: coral,
          boxShadow: '0 0 10px rgba(255,142,114,0.5)',
        }}
      />
      {/* bottom-right */}
      <span
        className={base}
        style={{
          bottom: 0,
          right: 0,
          width: corner,
          height: thick,
          background: mint,
          boxShadow: '0 0 10px rgba(114,255,169,0.6)',
        }}
      />
      <span
        className={base}
        style={{
          bottom: 0,
          right: 0,
          width: thick,
          height: corner,
          background: mint,
          boxShadow: '0 0 10px rgba(114,255,169,0.6)',
        }}
      />

      {/* Side midpoints — small pixel tick marks */}
      <span
        className={base}
        style={{
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 6,
          height: 6,
          background: mint,
          opacity: 0.7,
        }}
      />
      <span
        className={base}
        style={{
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 6,
          height: 6,
          background: mint,
          opacity: 0.7,
        }}
      />
      <span
        className={base}
        style={{
          top: '50%',
          left: 0,
          transform: 'translateY(-50%)',
          width: 6,
          height: 6,
          background: coral,
          opacity: 0.7,
        }}
      />
      <span
        className={base}
        style={{
          top: '50%',
          right: 0,
          transform: 'translateY(-50%)',
          width: 6,
          height: 6,
          background: coral,
          opacity: 0.7,
        }}
      />

      {/* caption */}
      <span
        className="absolute font-mono text-[10px] tracking-[0.25em] uppercase"
        style={{
          bottom: -20,
          left: corner + 4,
          color: mint,
          opacity: 0.7,
        }}
      >
        {'> portal czasu'}
      </span>
      <span
        className="absolute font-mono text-[10px] tracking-[0.25em] uppercase"
        style={{
          bottom: -20,
          right: corner + 4,
          color: coral,
          opacity: 0.7,
        }}
      >
        {'[jutro]'}
      </span>
    </div>
  );
}

function AmbientParticles({ visible }: { visible: boolean }) {
  if (!visible) return null;
  const particles = Array.from({ length: 6 });
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((_, i) => {
        const left = 20 + i * 12;
        const duration = 3 + (i % 3);
        const delay = (i * 0.6) % 3;
        return (
          <span
            key={i}
            className="absolute bottom-0 block size-[3px]"
            style={{
              left: `${left}%`,
              background: i % 2 === 0 ? 'var(--color-mint)' : 'var(--color-coral)',
              animation: `particleFloat ${duration}s ease-out ${delay}s infinite`,
            }}
          />
        );
      })}
    </div>
  );
}

const ANIMATION_TRANSITION: MotionProps['transition'] = {
  type: 'spring',
  stiffness: 675,
  damping: 75,
  mass: 1,
};

const tileViewClassNames = {
  // GRID
  // 2 Columns x 3 Rows
  grid: [
    'h-full w-full',
    'grid gap-x-2 place-content-center',
    'grid-cols-[1fr_1fr] grid-rows-[90px_1fr_90px]',
  ],
  // Agent
  // chatOpen: true,
  // hasSecondTile: true
  // layout: Column 1 / Row 1
  // align: x-end y-center
  agentChatOpenWithSecondTile: ['col-start-1 row-start-1', 'self-center justify-self-end'],
  // Agent
  // chatOpen: true,
  // hasSecondTile: false
  // layout: Column 1 / Row 1 / Column-Span 2
  // align: x-center y-center
  agentChatOpenWithoutSecondTile: ['col-start-1 row-start-1', 'col-span-2', 'place-content-center'],
  // Agent
  // chatOpen: false
  // layout: Column 1 / Row 1 / Column-Span 2 / Row-Span 3
  // align: x-center y-center
  agentChatClosed: ['col-start-1 row-start-1', 'col-span-2 row-span-3', 'place-content-center'],
  // Second tile
  // chatOpen: true,
  // hasSecondTile: true
  // layout: Column 2 / Row 1
  // align: x-start y-center
  secondTileChatOpen: ['col-start-2 row-start-1', 'self-center justify-self-start'],
  // Second tile
  // chatOpen: false,
  // hasSecondTile: false
  // layout: Column 2 / Row 2
  // align: x-end y-end
  secondTileChatClosed: ['col-start-2 row-start-3', 'place-content-end'],
};

export function useLocalTrackRef(source: Track.Source) {
  const { localParticipant } = useLocalParticipant();
  const publication = localParticipant.getTrackPublication(source);
  const trackRef = useMemo<TrackReference | undefined>(
    () => (publication ? { source, participant: localParticipant, publication } : undefined),
    [source, publication, localParticipant]
  );
  return trackRef;
}

interface TileLayoutProps {
  chatOpen: boolean;
  audioVisualizerType?: 'bar' | 'wave' | 'grid' | 'radial' | 'aura';
  audioVisualizerColor?: `#${string}`;
  audioVisualizerColorShift?: number;
  audioVisualizerWaveLineWidth?: number;
  audioVisualizerGridRowCount?: number;
  audioVisualizerGridColumnCount?: number;
  audioVisualizerRadialBarCount?: number;
  audioVisualizerRadialRadius?: number;
  audioVisualizerBarCount?: number;
}

export function TileLayout({
  chatOpen,
  audioVisualizerType,
  audioVisualizerColor,
  audioVisualizerColorShift,
  audioVisualizerBarCount,
  audioVisualizerRadialBarCount,
  audioVisualizerRadialRadius,
  audioVisualizerGridRowCount,
  audioVisualizerGridColumnCount,
  audioVisualizerWaveLineWidth,
}: TileLayoutProps) {
  const { videoTrack: agentVideoTrack } = useVoiceAssistant();
  const [screenShareTrack] = useTracks([Track.Source.ScreenShare]);
  const cameraTrack: TrackReference | undefined = useLocalTrackRef(Track.Source.Camera);

  const isCameraEnabled = cameraTrack && !cameraTrack.publication.isMuted;
  const isScreenShareEnabled = screenShareTrack && !screenShareTrack.publication.isMuted;
  const hasSecondTile = isCameraEnabled || isScreenShareEnabled;

  const animationDelay = chatOpen ? 0 : 0.15;
  const isAvatar = agentVideoTrack !== undefined;
  const videoWidth = agentVideoTrack?.publication.dimensions?.width ?? 0;
  const videoHeight = agentVideoTrack?.publication.dimensions?.height ?? 0;

  return (
    <div className="absolute inset-x-0 top-8 bottom-32 z-50 md:top-12 md:bottom-40">
      <div className="relative mx-auto h-full max-w-2xl px-4 md:px-0">
        <div className={cn(tileViewClassNames.grid)}>
          {/* Agent */}
          <div
            className={cn([
              'grid',
              !chatOpen && tileViewClassNames.agentChatClosed,
              chatOpen && hasSecondTile && tileViewClassNames.agentChatOpenWithSecondTile,
              chatOpen && !hasSecondTile && tileViewClassNames.agentChatOpenWithoutSecondTile,
            ])}
          >
            <AnimatePresence mode="popLayout">
              {!isAvatar && (
                // Audio Agent
                <motion.div
                  key="agent"
                  layoutId="agent"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{
                    ...ANIMATION_TRANSITION,
                    delay: animationDelay,
                  }}
                  className={cn('relative aspect-square h-[90px]')}
                >
                  <PortalFrame visible={!chatOpen} />
                  <AmbientParticles visible={!chatOpen} />
                  <AudioVisualizer
                    key="audio-visualizer"
                    initial={{ scale: 1 }}
                    animate={{ scale: chatOpen ? 0.2 : 1 }}
                    transition={{
                      ...ANIMATION_TRANSITION,
                      delay: animationDelay,
                    }}
                    audioVisualizerType={audioVisualizerType}
                    audioVisualizerColor={audioVisualizerColor}
                    audioVisualizerColorShift={audioVisualizerColorShift}
                    audioVisualizerBarCount={audioVisualizerBarCount}
                    audioVisualizerRadialBarCount={audioVisualizerRadialBarCount}
                    audioVisualizerRadialRadius={audioVisualizerRadialRadius}
                    audioVisualizerGridRowCount={audioVisualizerGridRowCount}
                    audioVisualizerGridColumnCount={audioVisualizerGridColumnCount}
                    audioVisualizerWaveLineWidth={audioVisualizerWaveLineWidth}
                    isChatOpen={chatOpen}
                    className={cn(
                      'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
                      'transition-[filter,opacity] duration-500'
                    )}
                    style={{
                      color: audioVisualizerColor,
                      filter: chatOpen
                        ? 'drop-shadow(0 0 12px rgba(114,255,169,0.35))'
                        : 'drop-shadow(0 0 32px rgba(114,255,169,0.45)) drop-shadow(0 0 80px rgba(255,142,114,0.12))',
                    }}
                  />
                </motion.div>
              )}

              {isAvatar && (
                // Avatar Agent
                <motion.div
                  key="avatar"
                  layoutId="avatar"
                  initial={{
                    scale: 1,
                    opacity: 1,
                    maskImage:
                      'radial-gradient(circle, rgba(0, 0, 0, 1) 0, rgba(0, 0, 0, 1) 20px, transparent 20px)',
                    filter: 'blur(20px)',
                  }}
                  animate={{
                    maskImage:
                      'radial-gradient(circle, rgba(0, 0, 0, 1) 0, rgba(0, 0, 0, 1) 500px, transparent 500px)',
                    filter: 'blur(0px)',
                    borderRadius: chatOpen ? 6 : 12,
                  }}
                  transition={{
                    ...ANIMATION_TRANSITION,
                    delay: animationDelay,
                    maskImage: {
                      duration: 1,
                    },
                    filter: {
                      duration: 1,
                    },
                  }}
                  className={cn(
                    'overflow-hidden bg-black drop-shadow-xl/80',
                    chatOpen ? 'h-[90px]' : 'h-auto w-full'
                  )}
                >
                  <VideoTrack
                    width={videoWidth}
                    height={videoHeight}
                    trackRef={agentVideoTrack}
                    className={cn(chatOpen && 'size-[90px] object-cover')}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div
            className={cn([
              'grid',
              chatOpen && tileViewClassNames.secondTileChatOpen,
              !chatOpen && tileViewClassNames.secondTileChatClosed,
            ])}
          >
            {/* Camera & Screen Share */}
            <AnimatePresence>
              {((cameraTrack && isCameraEnabled) || (screenShareTrack && isScreenShareEnabled)) && (
                <motion.div
                  key="camera"
                  layout="position"
                  layoutId="camera"
                  initial={{
                    opacity: 0,
                    scale: 0,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0,
                  }}
                  transition={{
                    ...ANIMATION_TRANSITION,
                    delay: animationDelay,
                  }}
                  className="aspect-square size-[90px] drop-shadow-lg/20"
                >
                  <VideoTrack
                    trackRef={cameraTrack || screenShareTrack}
                    width={(cameraTrack || screenShareTrack)?.publication.dimensions?.width ?? 0}
                    height={(cameraTrack || screenShareTrack)?.publication.dimensions?.height ?? 0}
                    className="bg-muted aspect-square size-[90px] rounded-md object-cover"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
