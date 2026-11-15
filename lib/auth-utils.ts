export function getBearerToken(value: string | null): string | null {
  if (!value) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(value.trim());
  return match?.[1] || null;
}

export async function fetchWithAccessToken(
  input: RequestInfo | URL,
  init: RequestInit,
  accessToken: string | undefined,
  fetcher: typeof fetch,
  baseUrl: string,
): Promise<Response> {
  const requestUrl = new URL(
    typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
    baseUrl,
  );
  if (requestUrl.origin !== new URL(baseUrl).origin) {
    throw new TypeError('Authenticated requests must target the current origin.');
  }

  const headers = new Headers(input instanceof Request ? input.headers : undefined);
  new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  headers.delete('Authorization');
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return fetcher(input, { ...init, headers });
}
