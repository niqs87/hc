'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const KEY_UID = 'jutra.uid';
const KEY_NAME = 'jutra.display_name';
const KEY_BASE_AGE = 'jutra.base_age';
const KEY_GENDER = 'jutra.gender';
const KEY_AUTH = 'jutra.auth_token';
const KEY_EMAIL = 'jutra.email';
const KEY_PRESESSION_UIDS = 'jutra.presession_done_uids';

export type Gender = 'f' | 'm' | 'u';

function normalizeGender(raw: unknown): Gender {
  return raw === 'f' || raw === 'm' ? raw : 'u';
}

function readPresessionDoneUids(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY_PRESESSION_UIDS);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** Whether this browser has finished the first-run portal config for `uid`. */
export function isPresessionComplete(uid: string): boolean {
  if (!uid) return false;
  return readPresessionDoneUids().includes(uid);
}

export function markPresessionComplete(uid: string): void {
  if (!uid) return;
  try {
    const uids = new Set(readPresessionDoneUids());
    uids.add(uid);
    localStorage.setItem(KEY_PRESESSION_UIDS, JSON.stringify([...uids]));
  } catch {
    /* ignore */
  }
}

export type JutraPrefs = {
  uid: string;
  displayName: string;
  baseAge: number;
  gender: Gender;
};

export type AuthSession = {
  uid: string;
  access_token: string;
  email: string;
};

type JutraPrefsContextValue = JutraPrefs & {
  authToken: string;
  accountEmail: string;
  agedPhotoUrl: string | null;
  setDisplayName: (n: string) => void;
  setBaseAge: (a: number) => void;
  setGender: (g: Gender) => void;
  setAgedPhotoUrl: (url: string | null) => void;
  setAuthSession: (s: AuthSession) => void;
  logout: () => void;
  ready: boolean;
};

const JutraPrefsContext = createContext<JutraPrefsContextValue | null>(null);

const DEFAULT_BASE_AGE = 15;

export function JutraPrefsProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [uid, setUidState] = useState('');
  const [authToken, setAuthTokenState] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [displayName, setDisplayNameState] = useState('Ty');
  const [baseAge, setBaseAgeState] = useState(DEFAULT_BASE_AGE);
  const [gender, setGenderState] = useState<Gender>('u');
  const [agedPhotoUrl, setAgedPhotoUrl] = useState<string | null>(null);

  const hydrateFromBackend = useCallback(async (u: string) => {
    if (!u) return;
    try {
      const res = await fetch(
        `/api/jutra/persona?uid=${encodeURIComponent(u)}`,
        { cache: 'no-store' }
      );
      if (!res.ok) return;
      const data = (await res.json()) as {
        display_name?: string;
        base_age?: number;
        gender?: string;
      };
      if (typeof data.display_name === 'string' && data.display_name.trim() !== '') {
        setDisplayNameState(data.display_name);
        try {
          localStorage.setItem(KEY_NAME, data.display_name);
        } catch {
          /* ignore */
        }
      }
      if (typeof data.base_age === 'number' && !Number.isNaN(data.base_age)) {
        const clamped = Math.min(80, Math.max(10, Math.round(data.base_age)));
        setBaseAgeState(clamped);
        try {
          localStorage.setItem(KEY_BASE_AGE, String(clamped));
        } catch {
          /* ignore */
        }
      }
      if (typeof data.gender === 'string') {
        const g = normalizeGender(data.gender);
        setGenderState(g);
        try {
          localStorage.setItem(KEY_GENDER, g);
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let activeUid = '';
    try {
      const t = localStorage.getItem(KEY_AUTH);
      const u = localStorage.getItem(KEY_UID);
      const e = localStorage.getItem(KEY_EMAIL);
      if (t && u) {
        setAuthTokenState(t);
        setUidState(u);
        if (e) setAccountEmail(e);
        activeUid = u;
      }

      const n = localStorage.getItem(KEY_NAME);
      if (n) setDisplayNameState(n);
      const ba = localStorage.getItem(KEY_BASE_AGE);
      if (ba) {
        const age = parseInt(ba, 10);
        if (!Number.isNaN(age) && age >= 10 && age <= 80) setBaseAgeState(age);
      }
      const g = localStorage.getItem(KEY_GENDER);
      if (g) setGenderState(normalizeGender(g));
    } finally {
      setReady(true);
    }
    // Re-hydrate from backend on every mount (page reload with an existing
    // auth session). This plugs the gap for legacy users whose KEY_GENDER was
    // never written to localStorage and lets the backend's inferred gender
    // reach the LiveKit token metadata.
    if (activeUid) {
      void hydrateFromBackend(activeUid);
    }
  }, [hydrateFromBackend]);

  const setDisplayName = (n: string) => {
    setDisplayNameState(n);
    try {
      localStorage.setItem(KEY_NAME, n);
    } catch {
      /* ignore */
    }
  };

  const setBaseAge = (a: number) => {
    const clamped = Math.min(80, Math.max(10, Math.round(a)));
    setBaseAgeState(clamped);
    try {
      localStorage.setItem(KEY_BASE_AGE, String(clamped));
    } catch {
      /* ignore */
    }
  };

  const setGender = (g: Gender) => {
    const norm = normalizeGender(g);
    setGenderState(norm);
    try {
      localStorage.setItem(KEY_GENDER, norm);
    } catch {
      /* ignore */
    }
  };

  const setAuthSession = useCallback(
    (s: AuthSession) => {
      setAuthTokenState(s.access_token);
      setUidState(s.uid);
      setAccountEmail(s.email);
      try {
        localStorage.setItem(KEY_AUTH, s.access_token);
        localStorage.setItem(KEY_UID, s.uid);
        localStorage.setItem(KEY_EMAIL, s.email);
      } catch {
        /* ignore */
      }
      void hydrateFromBackend(s.uid);
    },
    [hydrateFromBackend]
  );

  const logout = useCallback(() => {
    setAuthTokenState('');
    setUidState('');
    setAccountEmail('');
    setAgedPhotoUrl(null);
    try {
      localStorage.removeItem(KEY_AUTH);
      localStorage.removeItem(KEY_UID);
      localStorage.removeItem(KEY_EMAIL);
      localStorage.removeItem(KEY_NAME);
      localStorage.removeItem(KEY_BASE_AGE);
      localStorage.removeItem(KEY_GENDER);
    } catch {
      /* ignore */
    }
    setDisplayNameState('Ty');
    setBaseAgeState(DEFAULT_BASE_AGE);
    setGenderState('u');
  }, []);

  const value = useMemo<JutraPrefsContextValue>(
    () => ({
      uid,
      displayName,
      baseAge,
      gender,
      authToken,
      accountEmail,
      agedPhotoUrl,
      setDisplayName,
      setBaseAge,
      setGender,
      setAgedPhotoUrl,
      setAuthSession,
      logout,
      ready,
    }),
    [
      uid,
      displayName,
      baseAge,
      gender,
      authToken,
      accountEmail,
      agedPhotoUrl,
      ready,
      setAuthSession,
      logout,
    ]
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
