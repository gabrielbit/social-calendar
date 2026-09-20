import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const here = dirname(fileURLToPath(import.meta.url));
const candidates = [
  resolve(here, "../../../.env"), // monorepo root when running from apps/api/src|dist
  resolve(here, "../../.env"),
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "../../.env"),
];
for (const path of candidates) {
  if (existsSync(path)) {
    loadDotenv({ path });
    break;
  }
}

// Compat with root .env naming
if (!process.env.PORT && process.env.API_PORT) {
  process.env.PORT = process.env.API_PORT;
}
if (!process.env.GOOGLE_TOKEN_ENCRYPTION_KEY && process.env.TOKEN_ENCRYPTION_KEY) {
  process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY;
}
if (!process.env.APP_URL) {
  process.env.APP_URL = "http://localhost:3000";
}
if (!process.env.CORS_ORIGIN) {
  process.env.CORS_ORIGIN = "http://localhost:3000";
}

const EnvSchema = z.object({
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().url().optional(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  GOOGLE_TOKEN_ENCRYPTION_KEY: z.string().min(16).optional(),
  APP_URL: z.string().url(),
  CORS_ORIGIN: z.string().min(1),
});

export type Env = z.infer<typeof EnvSchema>;

function parseEnv(): Env {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  return result.data;
}

export const env = parseEnv();

export function corsOrigins(raw: string): string[] {
  const origins = raw.split(",").map((value) => value.trim()).filter(Boolean);
  const expanded: string[] = [];
  for (const origin of origins) {
    expanded.push(origin);
    try {
      const url = new URL(origin);
      const port = url.port ? `:${url.port}` : "";
      if (url.hostname === "localhost") {
        expanded.push(`${url.protocol}//127.0.0.1${port}`);
      } else if (url.hostname === "127.0.0.1") {
        expanded.push(`${url.protocol}//localhost${port}`);
      }
    } catch {
      // ignore malformed origin entries
    }
  }
  return [...new Set(expanded)];
}

export function assertGoogleCalendarConfigured(): void {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_TOKEN_ENCRYPTION_KEY) {
    throw Object.assign(
      new Error(
        "Google Calendar sync is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_TOKEN_ENCRYPTION_KEY.",
      ),
      { statusCode: 503 },
    );
  }
}
