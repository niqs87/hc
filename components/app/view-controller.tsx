'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { AnimatePresence, motion } from 'motion/react';
import { useSessionContext } from '@livekit/components-react';
import type { AppConfig } from '@/app-config';
import { AgentSessionView_01 } from '@/components/agents-ui/blocks/agent-session-view-01';
import { PreSessionView } from '@/components/app/pre-session-view';
import { WelcomeView } from '@/components/app/welcome-view';
import {
  isPresessionComplete,
  markPresessionComplete,
  useJutraPrefs,
} from '@/components/app/jutra-prefs-context';

const MotionWelcomeView = motion.create(WelcomeView);
const MotionSessionView = motion.create(AgentSessionView_01);

const VIEW_MOTION_PROPS = {
  variants: {
    visible: {
      opacity: 1,
    },
    hidden: {
      opacity: 0,
    },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
  transition: {
    duration: 0.5,
    ease: 'linear',
  },
};

interface ViewControllerProps {
  appConfig: AppConfig;
}

export function ViewController({ appConfig }: ViewControllerProps) {
  const { isConnected, start } = useSessionContext();
  const { resolvedTheme } = useTheme();
  const { agedPhotoUrl, logout, uid } = useJutraPrefs();
  const [stage, setStage] = useState<'welcome' | 'presession'>('welcome');
  const [portalSettingsOpen, setPortalSettingsOpen] = useState(false);

  const futureSelfPhotoUrl = agedPhotoUrl;
  const preConnectMessage = `> Portal otwarty. Powiedz, co chcesz dziś usłyszeć od siebie…`;

  return (
    <>
    <AnimatePresence mode="wait">
      {!isConnected && stage === 'welcome' && (
        <MotionWelcomeView
          key="welcome"
          {...VIEW_MOTION_PROPS}
          startButtonText={appConfig.startButtonText}
          onLogout={logout}
          onBeginPreflight={() => {
            if (!appConfig.backendPreSessionEnabled) {
              void start();
              return;
            }
            if (uid && isPresessionComplete(uid)) {
              void start();
              return;
            }
            setStage('presession');
          }}
        />
      )}
      {!isConnected && stage === 'presession' && appConfig.backendPreSessionEnabled && (
        <motion.div key="presession" {...VIEW_MOTION_PROPS}>
          <PreSessionView
            startButtonText={appConfig.startButtonText}
            onBack={() => setStage('welcome')}
            onStartVoice={() => {
              if (uid) markPresessionComplete(uid);
              void start();
            }}
          />
        </motion.div>
      )}
      {isConnected && (
        <MotionSessionView
          key="session-view"
          {...VIEW_MOTION_PROPS}
          preConnectMessage={preConnectMessage}
          futureSelfPhotoUrl={futureSelfPhotoUrl}
          onOpenPortalSettings={
            appConfig.backendPreSessionEnabled ? () => setPortalSettingsOpen(true) : undefined
          }
          supportsChatInput={appConfig.supportsChatInput}
          supportsVideoInput={appConfig.supportsVideoInput}
          supportsScreenShare={appConfig.supportsScreenShare}
          isPreConnectBufferEnabled={appConfig.isPreConnectBufferEnabled}
          audioVisualizerType={appConfig.audioVisualizerType}
          audioVisualizerColor={
            resolvedTheme === 'dark'
              ? appConfig.audioVisualizerColorDark
              : appConfig.audioVisualizerColor
          }
          audioVisualizerColorShift={appConfig.audioVisualizerColorShift}
          audioVisualizerBarCount={appConfig.audioVisualizerBarCount}
          audioVisualizerGridRowCount={appConfig.audioVisualizerGridRowCount}
          audioVisualizerGridColumnCount={appConfig.audioVisualizerGridColumnCount}
          audioVisualizerRadialBarCount={appConfig.audioVisualizerRadialBarCount}
          audioVisualizerRadialRadius={appConfig.audioVisualizerRadialRadius}
          audioVisualizerWaveLineWidth={appConfig.audioVisualizerWaveLineWidth}
          className="fixed inset-0"
        />
      )}
    </AnimatePresence>
    {portalSettingsOpen && appConfig.backendPreSessionEnabled && (
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-[2px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="portal-settings-title"
      >
        <div className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-none border border-[color:var(--color-mint)]/35 bg-[color:var(--background)] shadow-2xl">
          <h2 id="portal-settings-title" className="sr-only">
            Konfiguracja portalu
          </h2>
          <button
            type="button"
            onClick={() => setPortalSettingsOpen(false)}
            className="absolute right-3 top-3 z-10 font-mono text-sm text-[color:var(--muted-foreground)] hover:text-[color:var(--color-mint)]"
            aria-label="Zamknij ustawienia"
          >
            ✕
          </button>
          <PreSessionView
            startButtonText="Gotowe"
            showBackButton={false}
            onBack={() => setPortalSettingsOpen(false)}
            onStartVoice={() => setPortalSettingsOpen(false)}
          />
        </div>
      </div>
    )}
    </>
  );
}
