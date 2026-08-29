import Fastify from "fastify";
import { healthRoute } from "./routes/health.route";
import {
  registerRoute,
  type RegisterRouteOptions,
} from "./routes/register.route";

export type BuildServerDeps = RegisterRouteOptions;

export function buildServer(deps: BuildServerDeps = {}) {
  const app = Fastify();

  app.register(healthRoute);
  app.register(registerRoute, deps);

  return app;
}
