export type Json = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

export async function apiFetch<T = unknown>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    let message = 'Request failed';
    try {
      const data = await res.json();
      message = (data as { error?: string }).error || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  try {
    return (await res.json()) as T;
  } catch {
    return undefined as unknown as T;
  }
}

export const swrFetcher = <T = unknown>(url: string) => apiFetch<T>(url);


