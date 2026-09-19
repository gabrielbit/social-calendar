import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import Fastify, { type FastifyServerOptions } from "fastify";
import { env } from "./config.js";
import authPlugin from "./plugins/auth.js";
import activityRoutes from "./routes/activity.js";
import calendarRoutes from "./routes/calendar.js";
import communityRoutes from "./routes/community.js";
import eventsRoutes from "./routes/events.js";
import healthRoutes from "./routes/health.js";
import ingestRoutes from "./routes/ingest.js";
import moderationRoutes from "./routes/moderation.js";
import profilesRoutes from "./routes/profiles.js";
import rsvpRoutes from "./routes/rsvp.js";

export async function buildApp(opts: FastifyServerOptions = {}) {
  const app = Fastify({
    logger: true,
    ...opts,
  });

  await app.register(sensible);
  await app.register(cors, {
    origin: env.CORS_ORIGIN.split(",").map((value) => value.trim()),
    credentials: true,
  });
  await app.register(authPlugin);

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    const err = error as { statusCode?: number; message?: string };
    const statusCode = err.statusCode ?? 500;
    reply.code(statusCode).send({
      error: statusCode >= 500 ? "Internal server error" : (err.message ?? "Internal server error"),
      statusCode,
    });
  });

  await app.register(healthRoutes);

  await app.register(
    async (api) => {
      await api.register(profilesRoutes);
      await api.register(eventsRoutes);
      await api.register(communityRoutes);
      await api.register(rsvpRoutes);
      await api.register(ingestRoutes);
      await api.register(calendarRoutes);
      await api.register(moderationRoutes);
      await api.register(activityRoutes);
    },
    { prefix: "/api" },
  );

  return app;
}
