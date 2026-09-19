import { decryptTokens } from "../lib/crypto.js";
import { getSupabase } from "../lib/supabase.js";
import { log } from "../lib/logger.js";

export type GoogleSyncAction = "create" | "update" | "delete";

export type GoogleSyncPayload = {
  connectionId: string;
  syncId?: string;
  rsvpId?: string;
  externalEventId?: string;
};

type CalendarConnection = {
  id: string;
  user_id: string;
  provider: string;
  encrypted_tokens: string;
  external_calendar_id: string | null;
  status: string;
};

export async function loadCalendarConnection(connectionId: string): Promise<CalendarConnection | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("calendar_connections")
    .select("id, user_id, provider, encrypted_tokens, external_calendar_id, status")
    .eq("id", connectionId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

/** Stub listo para googleapis: descifra tokens y registra la acción. */
export async function syncGoogleCalendar(
  action: GoogleSyncAction,
  payload: GoogleSyncPayload,
): Promise<void> {
  const connection = await loadCalendarConnection(payload.connectionId);
  if (!connection) {
    throw new Error(`calendar_connection no encontrada: ${payload.connectionId}`);
  }
  if (connection.status !== "active") {
    log("warn", "Conexión inactiva; omitiendo sync", {
      connectionId: connection.id,
      status: connection.status,
    });
    return;
  }

  const tokensJson = decryptTokens(connection.encrypted_tokens);
  let tokens: Record<string, unknown>;
  try {
    tokens = JSON.parse(tokensJson) as Record<string, unknown>;
  } catch {
    throw new Error("Tokens descifrados no son JSON válido");
  }

  // Placeholder: aquí iría googleapis calendar.events.insert|patch|delete
  log("info", `[google-sync stub] ${action}`, {
    connectionId: connection.id,
    userId: connection.user_id,
    calendarId: connection.external_calendar_id,
    syncId: payload.syncId,
    rsvpId: payload.rsvpId,
    externalEventId: payload.externalEventId,
    hasAccessToken: typeof tokens.access_token === "string",
    hasRefreshToken: typeof tokens.refresh_token === "string",
  });
}
