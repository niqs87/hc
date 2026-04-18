'use client';

import { useMemo, useRef } from 'react';
import { TokenSource } from 'livekit-client';
import type { TokenSourceFetchOptions } from 'livekit-client';

import type { JutraPrefs } from '@/components/app/jutra-prefs-context';

/**
 * Stable custom {@link TokenSource} that always sends the latest uid / display
 * name / base age in `participant_metadata` when LiveKit requests a token.
 * The agent picks its own age standpoint per reply, so no horizon is sent.
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
        const meta = JSON.stringify({
          uid: p.uid,
          display_name: p.displayName,
          base_age: p.baseAge,
          gender: p.gender,
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
