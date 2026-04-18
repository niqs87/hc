import { NextResponse } from 'next/server';

import { jutraBackendBase } from '@/lib/jutra-backend';

export async function GET(req: Request) {
  try {
    const u = new URL(req.url);
    const uid = u.searchParams.get('uid');
    if (!uid) {
      return NextResponse.json({ error: 'uid required' }, { status: 400 });
    }
    const res = await fetch(
      `${jutraBackendBase()}/users/${encodeURIComponent(uid)}/photo/status`,
      { cache: 'no-store' }
    );
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'status failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
