'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/shadcn/utils';

type AgedStatus = 'pending' | 'done' | 'error';
type OverallStatus = 'none' | 'uploading' | 'processing' | 'done' | 'error';

function photoImageUrl(uid: string, kind: 'original' | 'aged') {
  return `/api/jutra/photo/image?uid=${encodeURIComponent(uid)}&kind=${kind}`;
}

export function PhotoUploadStep({
  uid,
  onAgedPhotoReady,
}: {
  uid: string;
  onAgedPhotoReady: (url: string | null) => void;
}) {
  const [overallStatus, setOverallStatus] = useState<OverallStatus>('none');
  const [agedStatus, setAgedStatus] = useState<AgedStatus>('pending');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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
        aged: { status: string; gcs_path?: string };
      };

      if (data.overall_status === 'none') return;

      const s = (data.aged?.status ?? 'pending') as AgedStatus;
      setAgedStatus(s);

      if (data.overall_status === 'done') {
        setOverallStatus('done');
        stopPolling();
        const url = s === 'done' ? photoImageUrl(uid, 'aged') : null;
        // eslint-disable-next-line no-console
        console.info('[jutra/photo] aged photo ready', { uid, hasUrl: Boolean(url) });
        onAgedPhotoReady(url);
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
  }, [uid, onAgedPhotoReady]);

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
    setAgedStatus('pending');
    setPreviewUrl(null);
    onAgedPhotoReady(null);
  };

  return (
    <div className="text-left space-y-4">
      <p className="font-mono text-[11px] tracking-[0.25em] text-[color:var(--color-mint)] uppercase opacity-70">
        Zdjęcie — trochę starsza wersja Ciebie (Imagen AI)
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
          <img src={previewUrl} alt="Podgląd" className="max-h-40 w-full object-contain" />
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
              className="max-h-32 w-full object-contain border border-[color:var(--color-mint)]/20"
            />
          )}
          <p className="font-mono text-[11px] text-[color:var(--color-mint)] animate-pulse">
            {'> '}Generowanie starszej wersji przez Imagen… (~30 s)
          </p>
          <div className="mx-auto w-40">
            <p className="font-mono text-[10px] text-center text-[color:var(--muted-foreground)] tracking-[0.15em]">
              Ty jutra
            </p>
            <div
              className={cn(
                'aspect-square border flex items-center justify-center mt-1',
                agedStatus === 'done'
                  ? 'border-[color:var(--color-mint)]/50'
                  : 'border-[color:var(--color-mint)]/20'
              )}
            >
              {agedStatus === 'done' ? (
                <img
                  src={photoImageUrl(uid, 'aged')}
                  alt="Ty jutra"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-mono text-[9px] text-[color:var(--muted-foreground)] animate-pulse">
                  {agedStatus === 'error' ? 'błąd' : '...'}
                </span>
              )}
            </div>
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
          <div className="mx-auto w-48">
            <p className="font-mono text-[10px] text-center tracking-[0.15em] text-[color:var(--color-coral)]">
              Ty jutra
            </p>
            <div className="aspect-square border border-[color:var(--color-coral)]/70 mt-1">
              <img
                src={photoImageUrl(uid, 'aged')}
                alt="Ty jutra"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <p className="font-mono text-[10px] text-[color:var(--color-mint)] tracking-[0.15em] text-center">
            {'> '}Zdjęcie gotowe — pojawi się w rozmowie głosowej.
          </p>
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
