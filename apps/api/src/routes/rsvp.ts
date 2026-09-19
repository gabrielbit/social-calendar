import { RsvpInputSchema } from "@agenda/domain";
import type { FastifyPluginAsync } from "fastify";
import { handleRouteError } from "../lib/route-errors.js";
import { listUserRsvps, upsertRsvp } from "../services/rsvp.js";

const rsvpRoutes: FastifyPluginAsync = async (app) => {
  app.put("/rsvp", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const body = RsvpInputSchema.parse(request.body);
      const rsvp = await upsertRsvp(request.user.id, body);
      return { rsvp };
    } catch (error) {
      return handleRouteError(reply, error);
    }
  });

  app.get("/rsvp/me", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const rsvps = await listUserRsvps(request.user.id);
      return { rsvps };
    } catch (error) {
      return handleRouteError(reply, error);
    }
  });
};

export default rsvpRoutes;
