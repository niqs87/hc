'use client';

import { useMemo } from 'react';
import { useSession } from '@livekit/components-react';
import { WarningIcon } from '@phosphor-icons/react/dist/ssr';
import type { AppConfig } from '@/app-config';
import { AgentSessionProvider } from '@/components/agents-ui/agent-session-provider';
import { StartAudioButton } from '@/components/agents-ui/start-audio-button';
import { ViewController } from '@/components/app/view-controller';
import { JutraPrefsProvider, useJutraPrefs } from '@/components/app/jutra-prefs-context';
import { Toaster } from '@/components/ui/sonner';
import { useAgentErrors } from '@/hooks/useAgentErrors';
import { useDebugMode } from '@/hooks/useDebug';
import { useJutraTokenSource } from '@/hooks/use-jutra-token-source';
import { getSandboxTokenSource } from '@/lib/utils';

const IN_DEVELOPMENT = process.env.NODE_ENV !== 'production';

function AppSetup() {
  useDebugMode({ enabled: IN_DEVELOPMENT });
  useAgentErrors();

  return null;
}

interface AppProps {
  appConfig: AppConfig;
}

function AppGate({ appConfig }: AppProps) {
  const prefs = useJutraPrefs();
  if (!prefs.ready || !prefs.uid) {
    return (
      <main className="relative grid min-h-svh grid-cols-1 place-content-center py-24">
        <div className="text-center text-sm text-muted-foreground">Ładowanie jutra…</div>
      </main>
    );
  }
  return <AppSessionInner appConfig={appConfig} />;
}

function AppSessionInner({ appConfig }: AppProps) {
  const prefs = useJutraPrefs();
  const jutraToken = useJutraTokenSource(
    {
      uid: prefs.uid,
      horizon: prefs.horizon,
      displayName: prefs.displayName,
    },
    appConfig.agentName
  );

  const tokenSource = useMemo(() => {
    if (typeof process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT === 'string') {
      return getSandboxTokenSource(appConfig);
    }
    return jutraToken;
  }, [appConfig, jutraToken]);

  const session = useSession(tokenSource, {
    agentName: appConfig.agentName,
  });

  return (
    <AgentSessionProvider session={session}>
      <AppSetup />
      <main className="relative grid min-h-svh grid-cols-1 place-content-center py-24">
        <ViewController appConfig={appConfig} />
      </main>
      <StartAudioButton label="Start Audio" />
      <Toaster
        icons={{
          warning: <WarningIcon weight="bold" />,
        }}
        position="top-center"
        className="toaster group"
        style={
          {
            '--normal-bg': 'var(--popover)',
            '--normal-text': 'var(--popover-foreground)',
            '--normal-border': 'var(--border)',
          } as React.CSSProperties
        }
      />
    </AgentSessionProvider>
  );
}

export function App({ appConfig }: AppProps) {
  return (
    <JutraPrefsProvider defaultHorizon={appConfig.defaultHorizon}>
      <AppGate appConfig={appConfig} />
    </JutraPrefsProvider>
  );
}
