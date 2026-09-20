import { CreateProfileSchema } from "@agenda/domain";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { handleRouteError } from "../lib/route-errors.js";
import { createServiceClient } from "../lib/supabase.js";
import {
  ensureOnboarding,
  getOwnerProfile,
  getPublicProfile,
  updatePreferences,
  updateProfile,
} from "../services/profiles.js";

const profilesRoutes: FastifyPluginAsync = async (app) => {
  app.post("/profiles/onboarding", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const body = CreateProfileSchema.parse(request.body);
      const profile = await ensureOnboarding(request.user.id, body);
      return reply.code(201).send({ profile });
    } catch (error) {
      return handleRouteError(reply, error);
    }
  });

  app.patch("/profiles/me", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const profile = await updateProfile(request.user.id, request.body as Record<string, unknown>);
      return { profile };
    } catch (error) {
      return handleRouteError(reply, error);
    }
  });

  app.get("/profiles/me", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const profile = await getOwnerProfile(request.user.id);
      if (!profile) return reply.code(404).send({ error: "Profile not found", statusCode: 404 });
      return { profile };
    } catch (error) {
      return handleRouteError(reply, error);
    }
  });

  app.patch("/preferences/me", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const preferences = await updatePreferences(
        request.user.id,
        request.body as Record<string, unknown>,
      );
      return { preferences };
    } catch (error) {
      return handleRouteError(reply, error);
    }
  });

  app.get("/profiles/:slug", async (request, reply) => {
    try {
      const { slug } = z.object({ slug: z.string() }).parse(request.params);
      let viewerId: string | undefined;

      if (request.headers.authorization?.startsWith("Bearer ")) {
        const jwt = request.headers.authorization.slice("Bearer ".length).trim();
        const { data } = await createServiceClient().auth.getUser(jwt);
        viewerId = data.user?.id;
      }

      const profile = await getPublicProfile(slug, viewerId);
      if (!profile) return reply.code(404).send({ error: "Profile not found", statusCode: 404 });
      return { profile };
    } catch (error) {
      return handleRouteError(reply, error);
    }
  });
};

export default profilesRoutes;
