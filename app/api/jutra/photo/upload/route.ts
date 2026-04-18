import { NextResponse } from 'next/server';

import { jutraBackendBase } from '@/lib/jutra-backend';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const uid = formData.get('uid') as string;
    if (!uid) {
      return NextResponse.json({ error: 'uid required' }, { status: 400 });
    }

    const backendForm = new FormData();
    const file = formData.get('file');
    if (!file) {
      return NextResponse.json({ error: 'file required' }, { status: 400 });
    }
    backendForm.append('file', file);

    const res = await fetch(
      `${jutraBackendBase()}/users/${encodeURIComponent(uid)}/photo/upload`,
      { method: 'POST', body: backendForm }
    );
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'upload failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
