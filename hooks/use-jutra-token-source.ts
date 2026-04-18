'use client';

import { useMemo, useRef } from 'react';
import { TokenSource } from 'livekit-client';
import type { TokenSourceFetchOptions } from 'livekit-client';

import type { Gender, JutraPrefs } from '@/components/app/jutra-prefs-context';

function normalizeGender(raw: unknown): Gender {
  return raw === 'f' || raw === 'm' ? raw : 'u';
}

/**
 * Resolve the user's gender just before requesting a LiveKit token. If we
 * still have the default "u" locally (e.g. the provider's background persona
 * hydration hasn't resolved yet, or the user never visited PreSessionView
 * since the gender feature landed), pull it straight from the backend so the
 * metadata we stamp on the token reflects the server-side inference. This is
 * what the agent worker reads to pick the TTS voice.
 */
async function resolveGender(uid: string, current: Gender): Promise<Gender> {
  if (current === 'f' || current === 'm') return current;
  try {
    const res = await fetch(
      `/api/jutra/persona?uid=${encodeURIComponent(uid)}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return current;
    const data = (await res.json()) as { gender?: string };
    return normalizeGender(data.gender);
  } catch {
    return current;
  }
}

/**
 * Stable custom {@link TokenSource} that always sends the latest uid / display
 * name / base age / gender in `participant_metadata` when LiveKit requests a
 * token. The agent picks its own age standpoint per reply, so no horizon is
 * sent.
 */
export function useJutraTokenSource(prefs: JutraPrefs, agentName?: string) {
  const ref = useRef(prefs);
  ref.current = prefs;

  return useMemo(
    () =>
      TokenSource.custom(async (opts: TokenSourceFetchOptions) => {
        const p = ref.current;
        if (!p.uid) {
          throw new Error('Brak uid — odśwież stronę.');
        }
        const agent = opts.agentName ?? agentName;
        const room_config = agent ? { agents: [{ agent_name: agent }] } : undefined;
        const gender = await resolveGender(p.uid, p.gender);
        const meta = JSON.stringify({
          uid: p.uid,
          display_name: p.displayName,
          base_age: p.baseAge,
          gender,
        });

        const res = await fetch('/api/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            room_config,
            participant_metadata: meta,
            participant_identity: `jutra_${p.uid}`,
            participant_name: p.displayName || 'Ty',
            room_name: opts.roomName,
          }),
        });
        if (!res.ok) {
          const err = await res.text();
          throw new Error(err || `Token request failed: ${res.status}`);
        }
        return (await res.json()) as {
          serverUrl: string;
          roomName: string;
          participantName: string;
          participantToken: string;
        };
      }),
    [agentName]
  );
}
