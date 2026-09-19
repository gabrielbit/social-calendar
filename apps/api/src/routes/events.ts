import { CreateEventSchema } from "@agenda/domain";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { handleRouteError } from "../lib/route-errors.js";
import { checkRateLimit } from "../services/moderation.js";
import {
  cancelOccurrence,
  createEvent,
  listAgendaOccurrences,
  updateEvent,
} from "../services/events.js";

const eventsRoutes: FastifyPluginAsync = async (app) => {
  app.post("/events", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      await checkRateLimit(request.user.id, "create_event");
      const body = CreateEventSchema.parse(request.body);
      const result = await createEvent(request.user.id, body);
      return reply.code(201).send(result);
    } catch (error) {
      return handleRouteError(reply, error);
    }
  });

  app.patch("/events/:eventId", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const { eventId } = z.object({ eventId: z.string().uuid() }).parse(request.params);
      const result = await updateEvent(request.user.id, eventId, request.body as Record<string, unknown>);
      return result;
    } catch (error) {
      return handleRouteError(reply, error);
    }
  });

  app.post("/events/occurrences/:occurrenceId/cancel", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const { occurrenceId } = z.object({ occurrenceId: z.string().uuid() }).parse(request.params);
      const occurrence = await cancelOccurrence(request.user.id, occurrenceId);
      return { occurrence };
    } catch (error) {
      return handleRouteError(reply, error);
    }
  });

  app.get("/agendas/:agendaId/occurrences", async (request, reply) => {
    try {
      const params = z
        .object({
          agendaId: z.string().uuid(),
        })
        .parse(request.params);

      const query = z
        .object({
          from: z.string().datetime({ offset: true }),
          to: z.string().datetime({ offset: true }),
        })
        .parse(request.query);

      let viewerId: string | undefined;
      if (request.headers.authorization?.startsWith("Bearer ")) {
        const jwt = request.headers.authorization.slice("Bearer ".length).trim();
        const { createServiceClient } = await import("../lib/supabase.js");
        const { data } = await createServiceClient().auth.getUser(jwt);
        viewerId = data.user?.id;
      }

      const occurrences = await listAgendaOccurrences({
        agendaId: params.agendaId,
        from: query.from,
        to: query.to,
        viewerId,
      });

      return { occurrences };
    } catch (error) {
      return handleRouteError(reply, error);
    }
  });
};

export default eventsRoutes;
