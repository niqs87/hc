import { NextResponse } from 'next/server';

import { jutraBackendBase, jutraBackendJsonHeaders } from '@/lib/jutra-backend';

export async function POST(req: Request) {
  try {
    const base = jutraBackendBase();
    const body = await req.json();
    const res = await fetch(`${base}/onboarding/start`, {
      method: 'POST',
      headers: jutraBackendJsonHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'onboarding start failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
