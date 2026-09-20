import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { assertGoogleCalendarConfigured, env } from "../config.js";
import { createServiceClient } from "../lib/supabase.js";

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.app.created",
  "openid",
  "email",
  "profile",
];

export type GoogleTokenPayload = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
};

export function buildGoogleOAuthStartUrl(userId: string): string {
  assertGoogleCalendarConfigured();
  const redirectUri = `${env.APP_URL}/auth/google-calendar/callback`;
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state: userId,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

function deriveKey(): Buffer {
  assertGoogleCalendarConfigured();
  return createHash("sha256").update(env.GOOGLE_TOKEN_ENCRYPTION_KEY!).digest();
}

export function encryptGoogleTokens(payload: GoogleTokenPayload): string {
  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptGoogleTokens(ciphertext: string): GoogleTokenPayload {
  const [ivB64, tagB64, dataB64] = ciphertext.split(".");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Invalid encrypted token format");
  }

  const key = deriveKey();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString("utf8")) as GoogleTokenPayload;
}

export async function saveGoogleConnection(userId: string, tokens: GoogleTokenPayload, externalCalendarId?: string) {
  const db = createServiceClient();
  const encrypted = encryptGoogleTokens(tokens);

  const { data, error } = await db
    .from("calendar_connections")
    .upsert(
      {
        user_id: userId,
        provider: "google",
        encrypted_tokens: encrypted,
        external_calendar_id: externalCalendarId ?? null,
        status: "active",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" },
    )
    .select("id, provider, status, external_calendar_id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to save calendar connection");
  return {
    id: String(data.id),
    provider: String(data.provider),
    status: String(data.status),
    externalCalendarId: data.external_calendar_id ? String(data.external_calendar_id) : null,
  };
}

export async function enqueueGoogleSyncJob(payload: {
  userId: string;
  rsvpId: string;
  occurrenceId: string;
  status: "going" | "not_going";
}) {
  const db = createServiceClient();
  const { error } = await db.from("outbox_jobs").insert({
    job_type: "google_calendar_sync",
    payload,
    status: "pending",
    run_after: new Date().toISOString(),
  });

  if (error) throw new Error(error.message);
  return { queued: true };
}

export async function exchangeGoogleAuthCode(userId: string, code: string, redirectUri: string) {
  assertGoogleCalendarConfigured();

  const body = new URLSearchParams({
    code,
    client_id: env.GOOGLE_CLIENT_ID!,
    client_secret: env.GOOGLE_CLIENT_SECRET!,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !json.access_token) {
    throw Object.assign(
      new Error(json.error_description ?? json.error ?? "Google no devolvió tokens"),
      { statusCode: 400 },
    );
  }

  return saveGoogleConnection(userId, {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: json.expires_in ? Date.now() + json.expires_in * 1000 : undefined,
  });
}
