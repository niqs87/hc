import { NextResponse } from 'next/server';

import { jutraBackendBase } from '@/lib/jutra-backend';

export async function POST(req: Request) {
  try {
    const base = jutraBackendBase();
    const { uid, ...rest } = await req.json();
    if (!uid || typeof uid !== 'string') {
      return NextResponse.json({ error: 'uid required' }, { status: 400 });
    }
    const res = await fetch(`${base}/users/${encodeURIComponent(uid)}/ingest/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rest),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'ingest failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
