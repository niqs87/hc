'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { nanoid } from 'nanoid';

const KEY_UID = 'jutra.uid';
const KEY_HORIZON = 'jutra.horizon';
const KEY_NAME = 'jutra.display_name';

export type JutraPrefs = {
  uid: string;
  horizon: number;
  displayName: string;
};

type JutraPrefsContextValue = JutraPrefs & {
  setHorizon: (h: number) => void;
  setDisplayName: (n: string) => void;
  ready: boolean;
};

const JutraPrefsContext = createContext<JutraPrefsContextValue | null>(null);

export function JutraPrefsProvider({
  children,
  defaultHorizon,
}: {
  children: React.ReactNode;
  defaultHorizon: number;
}) {
  const [ready, setReady] = useState(false);
  const [uid, setUid] = useState('');
  const [horizon, setHorizonState] = useState(defaultHorizon);
  const [displayName, setDisplayNameState] = useState('Ty');

  useEffect(() => {
    try {
      let u = localStorage.getItem(KEY_UID);
      if (!u) {
        u = nanoid(10);
        localStorage.setItem(KEY_UID, u);
      }
      setUid(u);

      const h = localStorage.getItem(KEY_HORIZON);
      if (h) {
        const n = parseInt(h, 10);
        if (!Number.isNaN(n)) setHorizonState(n);
      }
      const n = localStorage.getItem(KEY_NAME);
      if (n) setDisplayNameState(n);
    } finally {
      setReady(true);
    }
  }, []);

  const setHorizon = (h: number) => {
    setHorizonState(h);
    try {
      localStorage.setItem(KEY_HORIZON, String(h));
    } catch {
      /* ignore */
    }
  };

  const setDisplayName = (n: string) => {
    setDisplayNameState(n);
    try {
      localStorage.setItem(KEY_NAME, n);
    } catch {
      /* ignore */
    }
  };

  const value = useMemo<JutraPrefsContextValue>(
    () => ({
      uid,
      horizon,
      displayName,
      setHorizon,
      setDisplayName,
      ready,
    }),
    [uid, horizon, displayName, ready]
  );

  return <JutraPrefsContext.Provider value={value}>{children}</JutraPrefsContext.Provider>;
}

export function useJutraPrefs(): JutraPrefsContextValue {
  const ctx = useContext(JutraPrefsContext);
  if (!ctx) {
    throw new Error('useJutraPrefs must be used within JutraPrefsProvider');
  }
  return ctx;
}
