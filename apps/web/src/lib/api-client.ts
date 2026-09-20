"use client";

import { apiUrl } from "@/lib/api-url";
import { createClient } from "@/lib/supabase/client";

async function clientApiRequest<T>(method: string, path: string, json?: unknown): Promise<T> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (json !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  const res = await fetch(apiUrl(path), {
    method,
    headers,
    body: json === undefined ? undefined : JSON.stringify(json),
  });

  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      parsed = { error: text };
    }
  }

  if (!res.ok) {
    const message =
      typeof parsed === "object" && parsed && "error" in parsed
        ? String((parsed as { error: string }).error)
        : res.statusText;
    throw new Error(message);
  }

  return parsed as T;
}

export async function clientApiPost<T>(path: string, json: unknown): Promise<T> {
  return clientApiRequest<T>("POST", path, json);
}

export async function clientApiGet<T>(path: string): Promise<T> {
  return clientApiRequest<T>("GET", path);
}

export async function clientApiPatch<T>(path: string, json: unknown): Promise<T> {
  return clientApiRequest<T>("PATCH", path, json);
}

export async function clientApiPut<T>(path: string, json: unknown): Promise<T> {
  return clientApiRequest<T>("PUT", path, json);
}

export async function clientApiDelete<T>(path: string): Promise<T> {
  return clientApiRequest<T>("DELETE", path);
}
