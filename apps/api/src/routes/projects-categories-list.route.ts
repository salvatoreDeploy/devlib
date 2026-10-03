import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { createDb, getDatabaseUrl } from "@devlib/db";
import {
  listCategoriesForProject,
  ProjectNotFoundError,
  type ProjectCategoriesRepository,
} from "../services/categories.service";
import { createProjectsRepository } from "../repositories/projects.repository";
import { createCategoriesRepository } from "../repositories/categories.repository";
import { createAuthenticateMiddleware } from "../middleware/authenticate";
import type { AuthConfig } from "../config/env";

const projectParamsSchema = z.object({
  id: z.string().min(1).describe("Identificador (UUID) do projeto."),
});

const categoryResponseSchema = z.object({
  id: z.string().describe("Identificador (UUID) da categoria."),
  projectId: z
    .string()
    .nullable()
    .describe(
      "Identificador (UUID) do projeto dono da categoria, ou null quando é uma categoria global/predefinida.",
    ),
  name: z.string().describe("Nome da categoria."),
  createdAt: z.date().describe("Data/hora de criação da categoria."),
});

const errorResponseSchema = z.object({
  error: z.string().describe("Mensagem de erro legível."),
});

export type ProjectsCategoriesListRouteOptions = {
  projectsCategoriesRepository?: ProjectCategoriesRepository;
  authConfig?: AuthConfig;
};

export const projectsCategoriesListRoute: FastifyPluginAsyncZod<
  ProjectsCategoriesListRouteOptions
> = async (app, opts) => {
  let projectsCategoriesRepository = opts.projectsCategoriesRepository;

  function getProjectsCategoriesRepository(): ProjectCategoriesRepository {
    if (!projectsCategoriesRepository) {
      const db = createDb(getDatabaseUrl());
      projectsCategoriesRepository = {
        ...createProjectsRepository(db),
        ...createCategoriesRepository(db),
      };
    }
    return projectsCategoriesRepository;
  }

  app.get(
    "/projects/:id/categories",
    {
      preHandler: createAuthenticateMiddleware(opts.authConfig),
      schema: {
        tags: ["Categories"],
        summary: "Lista as categorias globais e as do projeto",
        description:
          "Retorna as categorias visíveis a um projeto: as globais/predefinidas (`projectId: null`) e as específicas desse projeto, combinadas numa lista só. Responde 404 se o projeto não existir ou não pertencer ao usuário autenticado. Sem paginação — lista completa em uma única resposta.",
        security: [{ bearerAuth: [] }],
        params: projectParamsSchema,
        response: {
          200: z
            .array(categoryResponseSchema)
            .describe(
              "Lista de categorias globais + do projeto, em nenhuma ordem garantida.",
            ),
          404: errorResponseSchema.describe(
            "Projeto não encontrado, ou encontrado mas de outro usuário.",
          ),
        },
      },
    },
    async (request, reply) => {
      try {
        const items = await listCategoriesForProject(
          getProjectsCategoriesRepository(),
          {
            userId: request.user.id,
            projectId: request.params.id,
          },
        );
        return reply.status(200).send(items);
      } catch (error) {
        if (error instanceof ProjectNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        throw error;
      }
    },
  );
};
