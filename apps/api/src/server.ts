import Fastify from "fastify";
import { healthRoute } from "./routes/health.route";
import {
  registerRoute,
  type RegisterRouteOptions,
} from "./routes/register.route";
import { loginRoute, type LoginRouteOptions } from "./routes/login.route";

export type BuildServerDeps = RegisterRouteOptions & LoginRouteOptions;

export function buildServer(deps: BuildServerDeps = {}) {
  const app = Fastify();

  app.register(healthRoute);
  app.register(registerRoute, deps);
  app.register(loginRoute, deps);

  return app;
}
