import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { createDb, getDatabaseUrl } from "@devlib/db";
import {
  deleteCategory,
  CategoryNotFoundError,
  ProjectNotFoundError,
  type ProjectCategoriesRepository,
} from "../services/categories.service";
import { createProjectsRepository } from "../repositories/projects.repository";
import { createCategoriesRepository } from "../repositories/categories.repository";
import { createAuthenticateMiddleware } from "../middleware/authenticate";
import type { AuthConfig } from "../config/env";

const paramsSchema = z.object({
  id: z.string().min(1).describe("Identificador (UUID) do projeto."),
  categoryId: z.string().min(1).describe("Identificador (UUID) da categoria."),
});

const errorResponseSchema = z.object({
  error: z.string().describe("Mensagem de erro legível."),
});

export type ProjectsCategoriesDeleteRouteOptions = {
  projectsCategoriesRepository?: ProjectCategoriesRepository;
  authConfig?: AuthConfig;
};

export const projectsCategoriesDeleteRoute: FastifyPluginAsyncZod<
  ProjectsCategoriesDeleteRouteOptions
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

  app.delete(
    "/projects/:id/categories/:categoryId",
    {
      preHandler: createAuthenticateMiddleware(opts.authConfig),
      schema: {
        tags: ["Categories"],
        summary: "Exclui uma categoria do projeto",
        description:
          "Exclui definitivamente uma categoria específica de um projeto (exclusão física, sem soft-delete). Responde 404 se o projeto não existir ou não pertencer ao usuário autenticado, e também 404 se a categoria não existir, for global/predefinida ou pertencer a outro projeto — não é possível excluir uma categoria global por essa rota.",
        security: [{ bearerAuth: [] }],
        params: paramsSchema,
        response: {
          204: z.null().describe("Categoria excluída com sucesso, sem corpo."),
          404: errorResponseSchema.describe(
            "Projeto não encontrado/de outro usuário, ou categoria não encontrada/global/de outro projeto.",
          ),
        },
      },
    },
    async (request, reply) => {
      try {
        await deleteCategory(getProjectsCategoriesRepository(), {
          userId: request.user.id,
          projectId: request.params.id,
          categoryId: request.params.categoryId,
        });
        return reply.status(204).send(null);
      } catch (error) {
        if (error instanceof ProjectNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        if (error instanceof CategoryNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        throw error;
      }
    },
  );
};
