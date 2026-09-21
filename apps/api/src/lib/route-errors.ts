import { z } from "zod";

type ReplyLike = {
  code: (status: number) => { send: (body: unknown) => unknown };
};

export function handleRouteError(reply: ReplyLike, error: unknown) {
  if (error instanceof z.ZodError) {
    return reply.code(400).send({
      error: error.issues.map((issue) => issue.message).join("; "),
      statusCode: 400,
    });
  }

  const message = error instanceof Error ? error.message : "Unexpected error";
  const status = (error as { statusCode?: number }).statusCode;

  if (typeof status === "number" && status >= 400) {
    return reply.code(status).send({ error: message, statusCode: status });
  }

  if (message.includes("Rate limit")) {
    return reply.code(429).send({ error: message, statusCode: 429 });
  }
  if (message === "Forbidden") {
    return reply.code(403).send({ error: message, statusCode: 403 });
  }
  if (/not found/i.test(message)) {
    return reply.code(404).send({ error: message, statusCode: 404 });
  }

  return reply.code(400).send({ error: message, statusCode: 400 });
}
