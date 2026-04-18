import { NextResponse } from 'next/server';

import { jutraBackendAuthHeaders, jutraBackendBase } from '@/lib/jutra-backend';

export async function GET(req: Request) {
  try {
    const base = jutraBackendBase();
    const u = new URL(req.url);
    const uid = u.searchParams.get('uid');
    if (!uid) {
      return NextResponse.json({ error: 'uid required' }, { status: 400 });
    }
    const res = await fetch(
      `${base}/users/${encodeURIComponent(uid)}/persona`,
      { cache: 'no-store', headers: jutraBackendAuthHeaders() }
    );
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'persona failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
