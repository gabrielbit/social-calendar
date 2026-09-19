import fp from "fastify-plugin";
import type { FastifyPluginAsync, FastifyReply } from "fastify";
import { createServiceClient } from "../lib/supabase.js";

const authPlugin: FastifyPluginAsync = async (app) => {
  const supabase = createServiceClient();

  app.decorate("authenticate", async (request, reply: FastifyReply) => {
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return reply.code(401).send({ error: "Missing bearer token", statusCode: 401 });
    }

    const jwt = header.slice("Bearer ".length).trim();
    if (!jwt) {
      return reply.code(401).send({ error: "Missing bearer token", statusCode: 401 });
    }

    const { data, error } = await supabase.auth.getUser(jwt);
    if (error || !data.user) {
      return reply.code(401).send({ error: "Invalid or expired token", statusCode: 401 });
    }

    request.user = data.user;
    request.jwt = jwt;
  });
};

// Break encapsulation so `authenticate` is visible to nested /api route plugins.
export default fp(authPlugin, {
  name: "auth-plugin",
});
