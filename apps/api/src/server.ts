import Fastify, {
  type FastifyError,
  type FastifyServerOptions,
} from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { getCorsConfig, type CorsConfig } from "./config/env";
import { DEFAULT_AVATAR_UPLOAD_DIR } from "./services/avatar-storage.service";
import {
  PG_INVALID_TEXT_REPRESENTATION,
  pgErrorCode,
} from "./repositories/pg-errors";
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
import { logoutRoute, type LogoutRouteOptions } from "./routes/logout.route";
import {
  projectsCreateRoute,
  type ProjectsCreateRouteOptions,
} from "./routes/projects-create.route";
import {
  projectsListRoute,
  type ProjectsListRouteOptions,
} from "./routes/projects-list.route";
import {
  projectsOverviewRoute,
  type ProjectsOverviewRouteOptions,
} from "./routes/projects-overview.route";
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
import {
  librariesCreateRoute,
  type LibrariesCreateRouteOptions,
} from "./routes/libraries-create.route";
import {
  librariesListRoute,
  type LibrariesListRouteOptions,
} from "./routes/libraries-list.route";
import {
  librariesGetRoute,
  type LibrariesGetRouteOptions,
} from "./routes/libraries-get.route";
import {
  librariesUpdateRoute,
  type LibrariesUpdateRouteOptions,
} from "./routes/libraries-update.route";
import {
  librariesDeleteRoute,
  type LibrariesDeleteRouteOptions,
} from "./routes/libraries-delete.route";
import {
  categoriesListRoute,
  type CategoriesListRouteOptions,
} from "./routes/categories-list.route";
import {
  projectsCategoriesListRoute,
  type ProjectsCategoriesListRouteOptions,
} from "./routes/projects-categories-list.route";
import {
  projectsCategoriesCreateRoute,
  type ProjectsCategoriesCreateRouteOptions,
} from "./routes/projects-categories-create.route";
import {
  projectsCategoriesDeleteRoute,
  type ProjectsCategoriesDeleteRouteOptions,
} from "./routes/projects-categories-delete.route";
import {
  librariesTagsCreateRoute,
  type LibrariesTagsCreateRouteOptions,
} from "./routes/libraries-tags-create.route";
import {
  librariesTagsListRoute,
  type LibrariesTagsListRouteOptions,
} from "./routes/libraries-tags-list.route";
import {
  projectsLibrariesListRoute,
  type ProjectsLibrariesListRouteOptions,
} from "./routes/projects-libraries-list.route";
import {
  projectsLibrariesAssociateRoute,
  type ProjectsLibrariesAssociateRouteOptions,
} from "./routes/projects-libraries-associate.route";
import {
  projectsLibrariesRemoveRoute,
  type ProjectsLibrariesRemoveRouteOptions,
} from "./routes/projects-libraries-remove.route";
import {
  librariesProjectsListRoute,
  type LibrariesProjectsListRouteOptions,
} from "./routes/libraries-projects-list.route";
import {
  librariesOverviewRoute,
  type LibrariesOverviewRouteOptions,
} from "./routes/libraries-overview.route";
import {
  usersMeGetRoute,
  type UsersMeGetRouteOptions,
} from "./routes/users-me-get.route";
import {
  usersMeUpdateRoute,
  type UsersMeUpdateRouteOptions,
} from "./routes/users-me-update.route";
import {
  usersMePhotoRoute,
  type UsersMePhotoRouteOptions,
} from "./routes/users-me-photo.route";

export type BuildServerDeps = RegisterRouteOptions &
  LoginRouteOptions &
  RefreshRouteOptions &
  LogoutRouteOptions &
  ProjectsCreateRouteOptions &
  ProjectsListRouteOptions &
  ProjectsOverviewRouteOptions &
  ProjectsGetRouteOptions &
  ProjectsUpdateRouteOptions &
  ProjectsDeleteRouteOptions &
  LibrariesCreateRouteOptions &
  LibrariesListRouteOptions &
  LibrariesGetRouteOptions &
  LibrariesUpdateRouteOptions &
  LibrariesDeleteRouteOptions &
  CategoriesListRouteOptions &
  ProjectsCategoriesListRouteOptions &
  ProjectsCategoriesCreateRouteOptions &
  ProjectsCategoriesDeleteRouteOptions &
  LibrariesTagsCreateRouteOptions &
  LibrariesTagsListRouteOptions &
  ProjectsLibrariesListRouteOptions &
  ProjectsLibrariesAssociateRouteOptions &
  ProjectsLibrariesRemoveRouteOptions &
  LibrariesProjectsListRouteOptions &
  LibrariesOverviewRouteOptions &
  UsersMeGetRouteOptions &
  UsersMeUpdateRouteOptions &
  UsersMePhotoRouteOptions & {
    corsConfig?: CorsConfig;
    logger?: FastifyServerOptions["logger"];
  };

export function buildServer(deps: BuildServerDeps = {}) {
  const app = Fastify({
    logger: deps.logger ?? false,
    disableRequestLogging: true,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.register(cors, {
    methods: ["GET", "HEAD", "POST", "PATCH", "PUT", "DELETE"],
    origin: (origin, callback) => {
      const { webUrl } = deps.corsConfig ?? getCorsConfig();
      callback(null, origin === webUrl);
    },
  });
  app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });
  app.register(multipart, {
    limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  });
  app.register(fastifyStatic, {
    root: DEFAULT_AVATAR_UPLOAD_DIR,
    prefix: "/uploads/avatars/",
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
        {
          name: "Libraries",
          description:
            "CRUD de bibliotecas do catálogo global. Diferente de projetos, biblioteca não tem dono — qualquer usuário autenticado pode ler, editar ou excluir qualquer biblioteca do catálogo compartilhado.",
        },
        {
          name: "Categories",
          description:
            "Categorias globais/predefinidas (seedadas, somente leitura via API) e categorias específicas de projeto (CRUD escopado a /projects/:id/categories, restrito ao dono do projeto).",
        },
        {
          name: "Tags",
          description:
            "Tags livres, globais e compartilhadas entre bibliotecas (sem dono). Ainda não há listagem/remoção via API — só criação sob demanda ao associar a uma biblioteca.",
        },
        {
          name: "Users",
          description: "Perfil do usuário autenticado.",
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

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      const [firstIssue] = error.validation;
      return reply
        .status(400)
        .send({ error: firstIssue?.message ?? "Erro de validação" });
    }

    // params como :id são z.string().min(1), sem .uuid() — um id malformado
    // chega ao Postgres e falha no cast pra uuid; não existe recurso com esse id
    if (pgErrorCode(error) === PG_INVALID_TEXT_REPRESENTATION) {
      return reply.status(404).send({ error: "Recurso não encontrado" });
    }

    const status = error.statusCode ?? 500;
    if (status >= 500) {
      // error.message pode carregar detalhes internos (ex: SQL da query em
      // erros do Drizzle) — o erro real fica só no log
      request.log.error({ err: error }, "erro não tratado");
      return reply.status(status).send({ error: "Erro interno do servidor" });
    }

    return reply.status(status).send({ error: error.message });
  });

  app.register(healthRoute);
  app.register(registerRoute, deps);
  app.register(loginRoute, deps);
  app.register(refreshRoute, deps);
  app.register(logoutRoute, deps);
  app.register(projectsCreateRoute, deps);
  app.register(projectsListRoute, deps);
  app.register(projectsOverviewRoute, deps);
  app.register(projectsGetRoute, deps);
  app.register(projectsUpdateRoute, deps);
  app.register(projectsDeleteRoute, deps);
  app.register(librariesCreateRoute, deps);
  app.register(librariesListRoute, deps);
  app.register(librariesOverviewRoute, deps);
  app.register(librariesGetRoute, deps);
  app.register(librariesUpdateRoute, deps);
  app.register(librariesDeleteRoute, deps);
  app.register(categoriesListRoute, deps);
  app.register(projectsCategoriesListRoute, deps);
  app.register(projectsCategoriesCreateRoute, deps);
  app.register(projectsCategoriesDeleteRoute, deps);
  app.register(librariesTagsCreateRoute, deps);
  app.register(librariesTagsListRoute, deps);
  app.register(projectsLibrariesListRoute, deps);
  app.register(projectsLibrariesAssociateRoute, deps);
  app.register(projectsLibrariesRemoveRoute, deps);
  app.register(librariesProjectsListRoute, deps);
  app.register(usersMeGetRoute, deps);
  app.register(usersMeUpdateRoute, deps);
  app.register(usersMePhotoRoute, deps);

  return app;
}
