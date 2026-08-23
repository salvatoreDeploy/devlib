import Fastify from "fastify";
import { healthRoute } from "./routes/health.route";

export function buildServer() {
  const app = Fastify();

  app.register(healthRoute);

  return app;
}
