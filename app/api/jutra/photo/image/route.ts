import { jutraBackendBase } from '@/lib/jutra-backend';

export async function GET(req: Request) {
  try {
    const u = new URL(req.url);
    const uid = u.searchParams.get('uid');
    const horizon = u.searchParams.get('horizon');
    const original = u.searchParams.get('original');

    if (!uid) return new Response(null, { status: 400 });

    const path = original
      ? `/users/${encodeURIComponent(uid)}/photo/original/image`
      : `/users/${encodeURIComponent(uid)}/photo/${horizon}/image`;

    const res = await fetch(`${jutraBackendBase()}${path}`);
    if (!res.ok) return new Response(null, { status: res.status });

    const bytes = await res.arrayBuffer();
    return new Response(bytes, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
