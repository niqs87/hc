import { NextResponse } from 'next/server';

import { jutraBackendBase } from '@/lib/jutra-backend';

export async function POST(req: Request) {
  try {
    const base = jutraBackendBase();
    const body = await req.json().catch(() => ({}));
    const res = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'login failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
