import { buildApp } from "./app.js";
import { env } from "./config.js";

async function main() {
  const app = await buildApp();
  const port = env.PORT;
  const host = "::";

  await app.listen({ port, host });
  app.log.info(`API listening on ${host}:${port}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
