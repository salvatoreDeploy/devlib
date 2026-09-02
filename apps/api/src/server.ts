import Fastify, { type FastifyError } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { getCorsConfig, type CorsConfig } from "./config/env";
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
import {
  projectsCreateRoute,
  type ProjectsCreateRouteOptions,
} from "./routes/projects-create.route";
import {
  projectsListRoute,
  type ProjectsListRouteOptions,
} from "./routes/projects-list.route";
import {
  projectsGetRoute,
  type ProjectsGetRouteOptions,
} from "./routes/projects-get.route";
import {
  projectsUpdateRoute,
  type ProjectsUpdateRouteOptions,
} from "./routes/projects-update.route";
import {
  projectsDeleteRoute,
  type ProjectsDeleteRouteOptions,
} from "./routes/projects-delete.route";

export type BuildServerDeps = RegisterRouteOptions &
  LoginRouteOptions &
  RefreshRouteOptions &
  ProjectsCreateRouteOptions &
  ProjectsListRouteOptions &
  ProjectsGetRouteOptions &
  ProjectsUpdateRouteOptions &
  ProjectsDeleteRouteOptions & {
    corsConfig?: CorsConfig;
  };

export function buildServer(deps: BuildServerDeps = {}) {
  const app = Fastify().withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.register(cors, {
    origin: (origin, callback) => {
      const { webUrl } = deps.corsConfig ?? getCorsConfig();
      callback(null, origin === webUrl);
    },
  });
  app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  app.register(swagger, {
    openapi: {
      info: {
        title: "DevLib API",
        description:
          "Catálogo pessoal de bibliotecas, frameworks e ferramentas.",
        version: "0.0.0",
      },
      tags: [
        { name: "Auth", description: "Registro, login e sessão (JWT)" },
        {
          name: "Projects",
          description:
            "CRUD de projetos do usuário autenticado. Todo projeto pertence a um único usuário (dono) — tentar ler, editar ou excluir um projeto de outro usuário responde 404, nunca 403 (evita confirmar a existência do ID a quem não é dono).",
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description:
              "Access token JWT retornado por POST /auth/login ou POST /auth/refresh, enviado como `Authorization: Bearer <token>`.",
          },
        },
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
  app.register(projectsCreateRoute, deps);
  app.register(projectsListRoute, deps);
  app.register(projectsGetRoute, deps);
  app.register(projectsUpdateRoute, deps);
  app.register(projectsDeleteRoute, deps);

  return app;
}
