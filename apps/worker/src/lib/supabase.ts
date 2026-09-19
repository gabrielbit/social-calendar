import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadConfig } from "../config.js";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;
  const env = loadConfig();
  client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export function resetSupabaseForTests(): void {
  client = null;
}

export type OutboxJob = {
  id: string;
  job_type: string;
  payload: Record<string, unknown>;
  status: "pending" | "processing" | "done" | "failed";
  attempts: number;
  run_after: string;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};
