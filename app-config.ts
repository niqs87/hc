export interface AppConfig {
  pageTitle: string;
  pageDescription: string;
  companyName: string;

  supportsChatInput: boolean;
  supportsVideoInput: boolean;
  supportsScreenShare: boolean;
  isPreConnectBufferEnabled: boolean;

  logo: string;
  startButtonText: string;
  accent?: string;
  logoDark?: string;
  accentDark?: string;

  audioVisualizerType?: 'bar' | 'wave' | 'grid' | 'radial' | 'aura';
  audioVisualizerColor?: `#${string}`;
  audioVisualizerColorDark?: `#${string}`;
  audioVisualizerColorShift?: number;
  audioVisualizerBarCount?: number;
  audioVisualizerGridRowCount?: number;
  audioVisualizerGridColumnCount?: number;
  audioVisualizerRadialBarCount?: number;
  audioVisualizerRadialRadius?: number;
  audioVisualizerWaveLineWidth?: number;

  // agent dispatch configuration
  agentName?: string;

  /** When true, show onboarding / ingest preflight before LiveKit voice. */
  backendPreSessionEnabled: boolean;

  // LiveKit Cloud Sandbox configuration
  sandboxId?: string;
}

export const APP_CONFIG_DEFAULTS: AppConfig = {
  companyName: 'Jutra',
  pageTitle: 'Jutra — porozmawiaj z przyszłym sobą',
  pageDescription:
    'Jutra to bezpieczna przestrzeń, gdzie możesz porozmawiać z AI, które wciela się w Ciebie za 10 lat.',

  supportsChatInput: true,
  supportsVideoInput: true,
  supportsScreenShare: true,
  isPreConnectBufferEnabled: true,

  logo: '/lk-logo.svg',
  accent: '#FF8E72',
  logoDark: '/lk-logo-dark.svg',
  accentDark: '#72FFA9',
  startButtonText: 'OTWÓRZ PORTAL',

  audioVisualizerType: 'aura',
  audioVisualizerColor: '#72FFA9',
  audioVisualizerColorDark: '#72FFA9',
  audioVisualizerColorShift: 0.15,
  // audioVisualizerBarCount: 5,
  // audioVisualizerType: 'radial',
  // audioVisualizerRadialBarCount: 24,
  // audioVisualizerRadialRadius: 100,
  // audioVisualizerType: 'grid',
  // audioVisualizerGridRowCount: 25,
  // audioVisualizerGridColumnCount: 25,
  // audioVisualizerType: 'wave',
  // audioVisualizerWaveLineWidth: 3,
  // audioVisualizerType: 'aura',

  // agent dispatch configuration
  agentName: process.env.AGENT_NAME ?? undefined,

  backendPreSessionEnabled: true,

  // LiveKit Cloud Sandbox configuration
  sandboxId: undefined,
};
