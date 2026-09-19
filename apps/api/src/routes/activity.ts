import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { createServiceClient } from "../lib/supabase.js";
import { handleRouteError } from "../lib/route-errors.js";

const activityRoutes: FastifyPluginAsync = async (app) => {
  app.get("/activity", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const query = z
        .object({
          limit: z.coerce.number().int().min(1).max(50).default(20),
        })
        .parse(request.query);

      const db = createServiceClient();
      const { data, error } = await db
        .from("activity_events")
        .select("id, actor_id, event_type, subject_type, subject_id, metadata, created_at")
        .eq("actor_id", request.user.id)
        .order("created_at", { ascending: false })
        .limit(query.limit);

      if (error) throw new Error(error.message);

      return {
        activity: (data ?? []).map((row) => ({
          id: Number(row.id),
          actorId: row.actor_id,
          eventType: row.event_type,
          subjectType: row.subject_type,
          subjectId: row.subject_id,
          metadata: row.metadata,
          createdAt: row.created_at,
        })),
      };
    } catch (error) {
      return handleRouteError(reply, error);
    }
  });

  app.post("/activity", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const body = z
        .object({
          eventType: z.string().min(1).max(80),
          subjectType: z.string().min(1).max(80),
          subjectId: z.string().uuid().optional(),
          metadata: z.record(z.unknown()).default({}),
        })
        .parse(request.body);

      const db = createServiceClient();
      const { data, error } = await db
        .from("activity_events")
        .insert({
          actor_id: request.user.id,
          event_type: body.eventType,
          subject_type: body.subjectType,
          subject_id: body.subjectId ?? null,
          metadata: body.metadata,
        })
        .select("id, event_type, subject_type, subject_id, created_at")
        .single();

      if (error || !data) throw new Error(error?.message ?? "Failed to record activity");

      return reply.code(201).send({
        activity: {
          id: Number(data.id),
          eventType: data.event_type,
          subjectType: data.subject_type,
          subjectId: data.subject_id,
          createdAt: data.created_at,
        },
      });
    } catch (error) {
      return handleRouteError(reply, error);
    }
  });
};

export default activityRoutes;
