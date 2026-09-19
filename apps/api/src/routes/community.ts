import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { handleRouteError } from "../lib/route-errors.js";
import {
  addAgendaSource,
  blockAggregation,
  followProfile,
  listFollowers,
  pinEvent,
  unfollowProfile,
} from "../services/community.js";

const communityRoutes: FastifyPluginAsync = async (app) => {
  app.post("/community/follow/:profileId", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const { profileId } = z.object({ profileId: z.string().uuid() }).parse(request.params);
      const result = await followProfile(request.user.id, profileId);
      return reply.code(201).send(result);
    } catch (error) {
      return handleRouteError(reply, error);
    }
  });

  app.delete("/community/follow/:profileId", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const { profileId } = z.object({ profileId: z.string().uuid() }).parse(request.params);
      return unfollowProfile(request.user.id, profileId);
    } catch (error) {
      return handleRouteError(reply, error);
    }
  });

  app.post("/community/agenda-sources", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const body = z
        .object({
          agendaId: z.string().uuid(),
          sourceProfileId: z.string().uuid().optional(),
          tagSlugs: z.array(z.string()).default([]),
          mode: z.enum(["all_public", "tags_intersection"]).default("all_public"),
          enabled: z.boolean().default(true),
        })
        .parse(request.body);

      const source = await addAgendaSource(request.user.id, body.agendaId, body);
      return reply.code(201).send({ source });
    } catch (error) {
      return handleRouteError(reply, error);
    }
  });

  app.post("/community/pins", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const pin = await pinEvent(request.user.id, request.body as unknown);
      return reply.code(201).send({ pin });
    } catch (error) {
      return handleRouteError(reply, error);
    }
  });

  app.post("/community/blocks", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const result = await blockAggregation(request.user.id, request.body as unknown);
      return reply.code(201).send(result);
    } catch (error) {
      return handleRouteError(reply, error);
    }
  });

  app.get("/community/followers/:profileId", async (request, reply) => {
    try {
      const { profileId } = z.object({ profileId: z.string().uuid() }).parse(request.params);
      const followers = await listFollowers(profileId);
      return { followers };
    } catch (error) {
      return handleRouteError(reply, error);
    }
  });
};

export default communityRoutes;
