import type { FastifyPluginAsync } from "fastify";
import { handleRouteError } from "../lib/route-errors.js";
import { createReport } from "../services/moderation.js";

const moderationRoutes: FastifyPluginAsync = async (app) => {
  app.post("/moderation/reports", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const report = await createReport(request.user.id, request.body as unknown);
      return reply.code(201).send({ report });
    } catch (error) {
      return handleRouteError(reply, error);
    }
  });
};

export default moderationRoutes;
