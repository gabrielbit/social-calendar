import { apiUrl } from "@/lib/api-url";
import { createClient } from "@/lib/supabase/server";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const auth = await getAuthHeader();
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...auth,
    ...(init?.headers as Record<string, string> | undefined),
  };

  let body = init?.body;
  if (init?.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.json);
  }

  const res = await fetch(apiUrl(path), {
    ...init,
    headers,
    body,
  });

  const text = await res.text();
  const parsed = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    const message =
      typeof parsed === "object" && parsed && "error" in parsed
        ? String((parsed as { error: string }).error)
        : res.statusText;
    throw new ApiError(message, res.status, parsed);
  }

  return parsed as T;
}

export async function apiPost<T>(path: string, json: unknown): Promise<T> {
  return apiFetch<T>(path, { method: "POST", json });
}

export async function apiPatch<T>(path: string, json: unknown): Promise<T> {
  return apiFetch<T>(path, { method: "PATCH", json });
}

export async function apiDelete<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: "DELETE" });
}
