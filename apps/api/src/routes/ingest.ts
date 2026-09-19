import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { handleRouteError } from "../lib/route-errors.js";
import { checkRateLimit } from "../services/moderation.js";
import { importIcs, parseFlyer } from "../services/ingest.js";

const ingestRoutes: FastifyPluginAsync = async (app) => {
  app.post("/ingest/ics", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      await checkRateLimit(request.user.id, "import_ics");
      const body = z
        .object({
          icsText: z.string().min(1).optional(),
          icsUrl: z.string().url().optional(),
        })
        .refine((value) => Boolean(value.icsText || value.icsUrl), {
          message: "Provide icsText or icsUrl",
        })
        .parse(request.body);

      const result = await importIcs(body);
      return reply.code(200).send(result);
    } catch (error) {
      return handleRouteError(reply, error);
    }
  });

  app.post("/ingest/flyer", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const body = z.object({ text: z.string().min(1).max(20_000) }).parse(request.body);
      return parseFlyer(body);
    } catch (error) {
      return handleRouteError(reply, error);
    }
  });
};

export default ingestRoutes;
