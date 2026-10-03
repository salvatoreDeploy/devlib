import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { createDb, getDatabaseUrl } from "@devlib/db";
import {
  createCategory,
  CategoryNameAlreadyExistsError,
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

const createCategoryBodySchema = z.object({
  name: z
    .string()
    .min(1)
    .describe(
      "Nome da categoria. Deve ser único entre as categorias desse projeto (categorias globais com o mesmo nome não bloqueiam).",
    ),
});

const categoryResponseSchema = z.object({
  id: z.string().describe("Identificador (UUID) da categoria."),
  projectId: z
    .string()
    .nullable()
    .describe("Identificador (UUID) do projeto dono da categoria."),
  name: z.string().describe("Nome da categoria."),
  createdAt: z.date().describe("Data/hora de criação da categoria."),
});

const errorResponseSchema = z.object({
  error: z.string().describe("Mensagem de erro legível."),
});

export type ProjectsCategoriesCreateRouteOptions = {
  projectsCategoriesRepository?: ProjectCategoriesRepository;
  authConfig?: AuthConfig;
};

export const projectsCategoriesCreateRoute: FastifyPluginAsyncZod<
  ProjectsCategoriesCreateRouteOptions
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

  app.post(
    "/projects/:id/categories",
    {
      preHandler: createAuthenticateMiddleware(opts.authConfig),
      schema: {
        tags: ["Categories"],
        summary: "Cria uma categoria no projeto",
        description:
          "Cria uma categoria específica de um projeto (`projectId` preenchido, diferente das categorias globais/predefinidas). Responde 404 se o projeto não existir ou não pertencer ao usuário autenticado, e 409 se já existir uma categoria com esse nome nesse mesmo projeto.",
        security: [{ bearerAuth: [] }],
        params: projectParamsSchema,
        body: createCategoryBodySchema,
        response: {
          201: categoryResponseSchema.describe("Categoria criada com sucesso."),
          404: errorResponseSchema.describe(
            "Projeto não encontrado, ou encontrado mas de outro usuário.",
          ),
          409: errorResponseSchema.describe(
            "Já existe uma categoria com esse nome nesse projeto.",
          ),
        },
      },
    },
    async (request, reply) => {
      try {
        const category = await createCategory(
          getProjectsCategoriesRepository(),
          {
            userId: request.user.id,
            projectId: request.params.id,
            name: request.body.name,
          },
        );
        return reply.status(201).send(category);
      } catch (error) {
        if (error instanceof ProjectNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        if (error instanceof CategoryNameAlreadyExistsError) {
          return reply.status(409).send({ error: error.message });
        }
        throw error;
      }
    },
  );
};
