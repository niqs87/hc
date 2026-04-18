import { jutraBackendAuthHeaders, jutraBackendBase } from '@/lib/jutra-backend';

export async function GET(req: Request) {
  try {
    const u = new URL(req.url);
    const uid = u.searchParams.get('uid');
    const kindRaw = (u.searchParams.get('kind') || '').toLowerCase();
    const original = u.searchParams.get('original');

    if (!uid) return new Response(null, { status: 400 });

    const kind = original === '1' ? 'original' : kindRaw === 'original' ? 'original' : 'aged';

    const path = `/users/${encodeURIComponent(uid)}/photo/${kind}/image`;

    const res = await fetch(`${jutraBackendBase()}${path}`, {
      headers: jutraBackendAuthHeaders(),
    });
    if (!res.ok) return new Response(null, { status: res.status });

    const bytes = await res.arrayBuffer();
    return new Response(bytes, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
