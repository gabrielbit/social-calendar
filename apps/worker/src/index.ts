import { loadConfig } from "./config.js";
import { log } from "./lib/logger.js";
import { processOutboxOnce } from "./jobs/process-outbox.js";

const runOnce = process.argv.includes("--once");

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const env = loadConfig();
  log("info", "Worker iniciado", { runOnce, pollMs: env.WORKER_POLL_INTERVAL_MS });

  if (runOnce) {
    const result = await processOutboxOnce();
    log("info", "Pase único completado", result);
    return;
  }

  while (true) {
    try {
      const result = await processOutboxOnce();
      if (result.processed > 0 || result.failed > 0) {
        log("info", "Outbox procesado", result);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log("error", "Error en loop del outbox", { error: message });
    }
    await sleep(env.WORKER_POLL_INTERVAL_MS);
  }
}

main().catch((err) => {
  console.error("[worker:fatal]", err);
  process.exit(1);
});
