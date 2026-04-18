export function jutraBackendBase(): string {
  const base = process.env.JUTRA_BACKEND_URL?.replace(/\/$/, '');
  if (!base) {
    throw new Error('JUTRA_BACKEND_URL is not configured');
  }
  return base;
}
