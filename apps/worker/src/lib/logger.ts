import { loadConfig } from "../config.js";

const levels = { debug: 0, info: 1, warn: 2, error: 3 } as const;

export function log(level: keyof typeof levels, message: string, meta?: Record<string, unknown>): void {
  const min = levels[loadConfig().LOG_LEVEL];
  if (levels[level] < min) return;
  const line = meta ? `${message} ${JSON.stringify(meta)}` : message;
  const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  fn(`[worker:${level}] ${line}`);
}
