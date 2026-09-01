import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { createDb, getDatabaseUrl } from "@devlib/db";
import {
  deleteProject,
  ProjectNotFoundError,
  type ProjectsRepository,
} from "../services/projects.service";
import { createProjectsRepository } from "../repositories/projects.repository";
import { createAuthenticateMiddleware } from "../middleware/authenticate";
import type { AuthConfig } from "../config/env";

const projectParamsSchema = z.object({
  id: z.string().min(1).describe("Identificador (UUID) do projeto."),
});

const errorResponseSchema = z.object({
  error: z.string().describe("Mensagem de erro legível."),
});

export type ProjectsDeleteRouteOptions = {
  projectsRepository?: ProjectsRepository;
  authConfig?: AuthConfig;
};

export const projectsDeleteRoute: FastifyPluginAsyncZod<
  ProjectsDeleteRouteOptions
> = async (app, opts) => {
  let projectsRepository = opts.projectsRepository;

  function getProjectsRepository(): ProjectsRepository {
    if (!projectsRepository) {
      projectsRepository = createProjectsRepository(createDb(getDatabaseUrl()));
    }
    return projectsRepository;
  }

  app.delete(
    "/projects/:id",
    {
      preHandler: createAuthenticateMiddleware(opts.authConfig),
      schema: {
        tags: ["Projects"],
        summary: "Exclui um projeto",
        description:
          "Exclui definitivamente um projeto do usuário autenticado (exclusão física, sem soft-delete). Responde 404 se o projeto não existir ou não pertencer ao usuário. Como `project_libraries` referencia `projects` com `onDelete: cascade`, qualquer associação desse projeto com bibliotecas é excluída junto.",
        security: [{ bearerAuth: [] }],
        params: projectParamsSchema,
        response: {
          204: z.null().describe("Projeto excluído com sucesso, sem corpo."),
          404: errorResponseSchema.describe(
            "Projeto não encontrado, ou encontrado mas de outro usuário.",
          ),
        },
      },
    },
    async (request, reply) => {
      try {
        await deleteProject(getProjectsRepository(), {
          userId: request.user.id,
          projectId: request.params.id,
        });
        return reply.status(204).send(null);
      } catch (error) {
        if (error instanceof ProjectNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        throw error;
      }
    },
  );
};
