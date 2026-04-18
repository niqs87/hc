'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/shadcn/utils';

type AgedStatus = 'pending' | 'done' | 'error';
type OverallStatus = 'none' | 'uploading' | 'processing' | 'done' | 'error';

const HORIZONS = [5, 10, 20, 30] as const;

function photoImageUrl(uid: string, horizon: number, ts?: number) {
  const base = `/api/jutra/photo/image?uid=${encodeURIComponent(uid)}&horizon=${horizon}`;
  return ts ? `${base}&t=${ts}` : base;
}
function originalImageUrl(uid: string) {
  return `/api/jutra/photo/image?uid=${encodeURIComponent(uid)}&original=1`;
}

export function PhotoUploadStep({
  uid,
  horizon,
  onPhotosReady,
}: {
  uid: string;
  horizon: number;
  onPhotosReady: (urls: Record<number, string>) => void;
}) {
  const [overallStatus, setOverallStatus] = useState<OverallStatus>('none');
  const [agedStatus, setAgedStatus] = useState<Record<number, AgedStatus>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadTs, setUploadTs] = useState<number>(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/jutra/photo/status?uid=${encodeURIComponent(uid)}`,
        { cache: 'no-store' }
      );
      if (!res.ok) return;
      const data = (await res.json()) as {
        overall_status: string;
        aged: Record<string, string>;
      };

      if (data.overall_status === 'none') return;

      const newAged: Record<number, AgedStatus> = {};
      for (const [h, s] of Object.entries(data.aged)) {
        newAged[Number(h)] = s as AgedStatus;
      }
      setAgedStatus(newAged);

      if (data.overall_status === 'done') {
        setOverallStatus('done');
        stopPolling();
        const urls: Record<number, string> = {};
        for (const h of HORIZONS) {
          if (newAged[h] === 'done') urls[h] = photoImageUrl(uid, h, uploadTs);
        }
        // eslint-disable-next-line no-console
        console.info('[jutra/photo] all horizons ready', { uid, horizons: Object.keys(urls) });
        onPhotosReady(urls);
      } else if (data.overall_status === 'error') {
        // eslint-disable-next-line no-console
        console.error('[jutra/photo] aging pipeline reported error', { uid });
        setOverallStatus('error');
        stopPolling();
      } else if (data.overall_status === 'processing') {
        setOverallStatus('processing');
      }
    } catch {
      // ignore transient poll errors
    }
  }, [uid, onPhotosReady]);

  // On mount: check if photos already exist for this user
  useEffect(() => {
    void checkStatus();
  }, [checkStatus]);

  useEffect(() => () => stopPolling(), []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setOverallStatus('uploading');
    const ts = Date.now();
    setUploadTs(ts);
    stopPolling();

    const form = new FormData();
    form.append('uid', uid);
    form.append('file', file);

    try {
      // eslint-disable-next-line no-console
      console.info('[jutra/photo] uploading', {
        uid,
        size: file.size,
        type: file.type,
      });
      const res = await fetch('/api/jutra/photo/upload', { method: 'POST', body: form });
      if (!res.ok) {
        // eslint-disable-next-line no-console
        console.error('[jutra/photo] upload failed', { uid, status: res.status });
        setOverallStatus('error');
        return;
      }
      setOverallStatus('processing');
      pollRef.current = setInterval(() => void checkStatus(), 3500);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[jutra/photo] upload threw', err);
      setOverallStatus('error');
    }

    // reset input so the same file can be re-selected
    if (fileRef.current) fileRef.current.value = '';
  };

  const openPicker = (capture?: 'user' | 'environment') => {
    if (!fileRef.current) return;
    if (capture) fileRef.current.setAttribute('capture', capture);
    else fileRef.current.removeAttribute('capture');
    fileRef.current.click();
  };

  const reset = () => {
    stopPolling();
    setOverallStatus('none');
    setAgedStatus({});
    setPreviewUrl(null);
    setUploadTs(0);
  };

  const currentPhotoUrl =
    overallStatus === 'done' && agedStatus[horizon] === 'done'
      ? photoImageUrl(uid, horizon, uploadTs)
      : null;

  return (
    <div className="text-left space-y-4">
      <p className="font-mono text-[11px] tracking-[0.25em] text-[color:var(--color-mint)] uppercase opacity-70">
        Opcja C — zdjęcie (Imagen AI)
      </p>

      {overallStatus === 'none' && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openPicker()}
            className="pixel-btn clip-pixel-4 cursor-pointer px-4 py-2 font-mono text-xs uppercase"
          >
            Wgraj zdjęcie
          </button>
          <button
            type="button"
            onClick={() => openPicker('user')}
            className="pixel-btn clip-pixel-4 cursor-pointer px-4 py-2 font-mono text-xs uppercase"
          >
            Zrób zdjęcie
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => void handleFile(e)}
          />
        </div>
      )}

      {overallStatus === 'uploading' && previewUrl && (
        <div className="border border-[color:var(--color-mint)]/30 p-3 space-y-2">
          <img
            src={previewUrl}
            alt="Podgląd"
            className="max-h-40 w-full object-contain"
          />
          <p className="font-mono text-[11px] text-[color:var(--color-mint)] animate-pulse">
            {'> '}Wysyłanie...
          </p>
        </div>
      )}

      {overallStatus === 'processing' && (
        <div className="space-y-2">
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Oryginał"
              className="max-h-28 w-full object-contain border border-[color:var(--color-mint)]/20"
            />
          )}
          <p className="font-mono text-[11px] text-[color:var(--color-mint)] animate-pulse">
            {'> '}Generowanie wersji przez Imagen… (~60 s)
          </p>
          <div className="grid grid-cols-4 gap-2">
            {HORIZONS.map((h) => (
              <div key={h} className="space-y-1">
                <p className="font-mono text-[10px] text-center text-[color:var(--muted-foreground)] tracking-[0.15em]">
                  +{h} lat
                </p>
                <div
                  className={cn(
                    'aspect-square border flex items-center justify-center',
                    agedStatus[h] === 'done'
                      ? 'border-[color:var(--color-mint)]/50'
                      : 'border-[color:var(--color-mint)]/20'
                  )}
                >
                  {agedStatus[h] === 'done' ? (
                    <img
                      src={photoImageUrl(uid, h, uploadTs)}
                      alt={`+${h} lat`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="font-mono text-[9px] text-[color:var(--muted-foreground)] animate-pulse">
                      {agedStatus[h] === 'error' ? 'błąd' : '...'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {overallStatus === 'error' && (
        <div className="space-y-2">
          <p className="font-mono text-[11px] text-[color:var(--color-coral)]">
            {'> '}Błąd generowania. Spróbuj ponownie.
          </p>
          <button
            type="button"
            onClick={reset}
            className="pixel-btn clip-pixel-4 cursor-pointer px-4 py-2 font-mono text-xs uppercase"
          >
            Spróbuj ponownie
          </button>
        </div>
      )}

      {overallStatus === 'done' && (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {HORIZONS.map((h) => (
              <div key={h} className="space-y-1">
                <p
                  className={cn(
                    'font-mono text-[10px] text-center tracking-[0.15em]',
                    h === horizon
                      ? 'text-[color:var(--color-coral)]'
                      : 'text-[color:var(--muted-foreground)]'
                  )}
                >
                  +{h} lat{h === horizon ? ' ◀' : ''}
                </p>
                <div
                  className={cn(
                    'aspect-square border',
                    h === horizon
                      ? 'border-[color:var(--color-coral)]/70'
                      : 'border-[color:var(--color-mint)]/30'
                  )}
                >
                  <img
                    src={photoImageUrl(uid, h, uploadTs)}
                    alt={`+${h} lat`}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            ))}
          </div>
          {currentPhotoUrl && (
            <p className="font-mono text-[10px] text-[color:var(--color-mint)] tracking-[0.15em]">
              {'> '}Zdjęcie na wybrany horyzont (+{horizon} lat) aktywne
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            className="font-mono text-[10px] tracking-[0.2em] text-[color:var(--muted-foreground)] uppercase underline-offset-4 hover:underline"
          >
            Zmień zdjęcie
          </button>
        </div>
      )}
    </div>
  );
}
