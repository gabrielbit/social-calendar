import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../config.js";

export type DatabaseClient = SupabaseClient;

const serverAuthOptions = {
  autoRefreshToken: false,
  persistSession: false,
} as const;

/** Server-side client: no browser session / realtime needed. */
export function createServiceClient(): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: serverAuthOptions,
  });
}

export function createUserClient(jwt: string): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    },
    auth: serverAuthOptions,
  });
}
