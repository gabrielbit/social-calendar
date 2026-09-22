import type { FastifyPluginAsync } from "fastify";
import { handleRouteError } from "../lib/route-errors.js";
import { checkRateLimit } from "../services/moderation.js";
import {
  createEventFromAgentDraft,
  getLatestThread,
  isAgentEnabled,
  runAgentTurn,
} from "../services/agent.js";

const agentRoutes: FastifyPluginAsync = async (app) => {
  app.get("/agent/status", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const enabled = await isAgentEnabled(request.user.id);
      return { enabled };
    } catch (error) {
      return handleRouteError(reply, error);
    }
  });

  app.get("/agent/thread", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      const thread = await getLatestThread(request.user.id);
      return { thread };
    } catch (error) {
      return handleRouteError(reply, error);
    }
  });

  app.post("/agent/turns", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      await checkRateLimit(request.user.id, "agent_turn");
      const result = await runAgentTurn(request.user.id, request.body);
      return reply.code(200).send(result);
    } catch (error) {
      return handleRouteError(reply, error);
    }
  });

  app.post("/agent/create-event", { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      await checkRateLimit(request.user.id, "create_event");
      const result = await createEventFromAgentDraft(request.user.id, request.body);
      return reply.code(201).send(result);
    } catch (error) {
      return handleRouteError(reply, error);
    }
  });
};

export default agentRoutes;
