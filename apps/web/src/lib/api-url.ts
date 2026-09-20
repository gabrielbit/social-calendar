function trimSlash(value: string): string {
  return value.replace(/\/$/, "");
}

function isLocalHost(origin: string): boolean {
  try {
    const host = new URL(origin).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return true;
  }
}

const API_ORIGIN = trimSlash(
  process.env.API_PROXY_ORIGIN ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
);

function apiOrigin(): string {
  return API_ORIGIN;
}

function withApiPrefix(origin: string, suffix: string): string {
  const base = trimSlash(origin);
  if (base.endsWith("/api")) return `${base}${suffix}`;
  return `${base}/api${suffix}`;
}

/** En local el browser usa el proxy same-origin. En producción pega directo a la API de Railway. */
export function apiUrl(path: string): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  const publicApi = process.env.NEXT_PUBLIC_API_URL;

  if (typeof window !== "undefined") {
    if (publicApi && !isLocalHost(publicApi)) {
      return withApiPrefix(publicApi, suffix);
    }
    return `/backend${suffix}`;
  }

  return withApiPrefix(apiOrigin(), suffix);
}

export function apiOriginUrl(): string {
  return apiOrigin();
}
