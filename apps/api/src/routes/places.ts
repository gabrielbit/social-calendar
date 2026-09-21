import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { handleRouteError } from "../lib/route-errors.js";
import { autocompletePlaces } from "../services/places.js";

const placesRoutes: FastifyPluginAsync = async (app) => {
  app.get("/places/autocomplete", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const { q } = z.object({ q: z.string().min(1).max(120) }).parse(request.query);
      const suggestions = await autocompletePlaces(q);
      return { suggestions };
    } catch (error) {
      return handleRouteError(reply, error);
    }
  });
};

export default placesRoutes;
