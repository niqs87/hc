import { NextResponse } from 'next/server';

import { jutraBackendBase } from '@/lib/jutra-backend';

export async function POST(req: Request) {
  const started = Date.now();
  try {
    const formData = await req.formData();
    const uid = formData.get('uid') as string;
    if (!uid) {
      console.warn('[jutra/photo/upload] missing uid');
      return NextResponse.json({ error: 'uid required' }, { status: 400 });
    }

    const backendForm = new FormData();
    const file = formData.get('file');
    if (!file) {
      console.warn('[jutra/photo/upload] missing file', { uid });
      return NextResponse.json({ error: 'file required' }, { status: 400 });
    }
    const size = file instanceof File ? file.size : undefined;
    const type = file instanceof File ? file.type : undefined;
    console.info('[jutra/photo/upload] proxying to backend', { uid, size, type });
    backendForm.append('file', file);

    const res = await fetch(
      `${jutraBackendBase()}/users/${encodeURIComponent(uid)}/photo/upload`,
      { method: 'POST', body: backendForm }
    );
    const data = await res.json().catch(() => ({}));
    console.info('[jutra/photo/upload] backend responded', {
      uid,
      status: res.status,
      ms: Date.now() - started,
    });
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'upload failed';
    console.error('[jutra/photo/upload] proxy error', { msg, ms: Date.now() - started });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
