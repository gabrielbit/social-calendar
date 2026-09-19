import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { env } from "../config.js";
import { handleRouteError } from "../lib/route-errors.js";
import {
  buildGoogleOAuthStartUrl,
  enqueueGoogleOAuthExchangeJob,
  saveGoogleConnection,
} from "../services/calendar-sync.js";

const calendarRoutes: FastifyPluginAsync = async (app) => {
  app.get("/calendar/google/connect", { preHandler: [app.authenticate] }, async (request) => {
    const url = buildGoogleOAuthStartUrl(request.user.id);
    return { url };
  });

  app.post("/calendar/google/callback", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const body = z.object({ code: z.string().min(1) }).parse(request.body);
      const redirectUri = `${env.APP_URL}/api/calendar/google/callback`;

      await enqueueGoogleOAuthExchangeJob({
        userId: request.user.id,
        code: body.code,
        redirectUri,
      });

      return reply.code(202).send({ queued: true });
    } catch (error) {
      return handleRouteError(reply, error);
    }
  });

  app.post("/calendar/google/tokens", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const body = z
        .object({
          accessToken: z.string().min(1),
          refreshToken: z.string().optional(),
          expiresAt: z.number().optional(),
          externalCalendarId: z.string().optional(),
        })
        .parse(request.body);

      const connection = await saveGoogleConnection(
        request.user.id,
        {
          accessToken: body.accessToken,
          refreshToken: body.refreshToken,
          expiresAt: body.expiresAt,
        },
        body.externalCalendarId,
      );

      return reply.code(201).send({ connection });
    } catch (error) {
      return handleRouteError(reply, error);
    }
  });
};

export default calendarRoutes;
