const API_ORIGIN =
  process.env.API_PROXY_ORIGIN ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function apiOrigin(): string {
  return API_ORIGIN.replace(/\/$/, "");
}

/** En el browser usamos el proxy same-origin para evitar CORS. En el server, la API directa. */
export function apiUrl(path: string): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  if (typeof window !== "undefined") {
    return `/backend${suffix}`;
  }
  return `${apiOrigin()}/api${suffix}`;
}

export function apiOriginUrl(): string {
  return apiOrigin();
}
