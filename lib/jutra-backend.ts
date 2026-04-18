export function jutraBackendBase(): string {
  const base = process.env.JUTRA_BACKEND_URL?.replace(/\/$/, '');
  if (!base) {
    throw new Error('JUTRA_BACKEND_URL is not configured');
  }
  return base;
}

/** Match backend `API_BEARER_TOKEN` when the Jutra API is protected (e.g. Cloud Run). */
export function jutraBackendAuthHeaders(): Record<string, string> {
  const token = process.env.JUTRA_API_BEARER_TOKEN?.trim();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export function jutraBackendJsonHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...jutraBackendAuthHeaders(),
  };
}
