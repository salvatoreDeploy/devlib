import Fastify, { type FastifyError } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import {
  hasZodFastifySchemaValidationErrors,
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
import { refreshRoute, type RefreshRouteOptions } from "./routes/refresh.route";

export type BuildServerDeps = RegisterRouteOptions &
  LoginRouteOptions &
  RefreshRouteOptions;

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

  app.setErrorHandler((error: FastifyError, _request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      const [firstIssue] = error.validation;
      return reply
        .status(400)
        .send({ error: firstIssue?.message ?? "Erro de validação" });
    }

    return reply.status(error.statusCode ?? 500).send({ error: error.message });
  });

  app.register(healthRoute);
  app.register(registerRoute, deps);
  app.register(loginRoute, deps);
  app.register(refreshRoute, deps);

  return app;
}
