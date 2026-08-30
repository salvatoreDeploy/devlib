import Fastify from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { healthRoute } from "./routes/health.route";
import {
  registerRoute,
  type RegisterRouteOptions,
} from "./routes/register.route";
import { loginRoute, type LoginRouteOptions } from "./routes/login.route";

export type BuildServerDeps = RegisterRouteOptions & LoginRouteOptions;

export function buildServer(deps: BuildServerDeps = {}) {
  const app = Fastify().withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.register(swagger, {
    openapi: {
      info: {
        title: "DevLib API",
        description:
          "Catálogo pessoal de bibliotecas, frameworks e ferramentas.",
        version: "0.0.0",
      },
    },
    transform: jsonSchemaTransform,
  });
  app.register(swaggerUi, { routePrefix: "/docs" });

  app.register(healthRoute);
  app.register(registerRoute, deps);
  app.register(loginRoute, deps);

  return app;
}
