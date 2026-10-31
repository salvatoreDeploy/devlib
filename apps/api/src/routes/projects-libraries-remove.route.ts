import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { createDb, getDatabaseUrl } from "@devlib/db";
import {
  removeLibraryFromProject,
  ProjectLibraryNotFoundError,
  ProjectNotFoundError,
  type ProjectLibrariesRepository,
} from "../services/project-libraries.service";
import { createProjectsRepository } from "../repositories/projects.repository";
import { createLibrariesRepository } from "../repositories/libraries.repository";
import { createProjectLibrariesRepository } from "../repositories/project-libraries.repository";
import { createAuthenticateMiddleware } from "../middleware/authenticate";
import type { AuthConfig } from "../config/env";

const paramsSchema = z.object({
  id: z.string().min(1).describe("Identificador (UUID) do projeto."),
  libraryId: z
    .string()
    .min(1)
    .describe("Identificador (UUID) da biblioteca associada."),
});

const errorResponseSchema = z.object({
  error: z.string().describe("Mensagem de erro legível."),
});

export type ProjectsLibrariesRemoveRouteOptions = {
  projectLibraryAssociationsRepository?: ProjectLibrariesRepository;
  authConfig?: AuthConfig;
};

export const projectsLibrariesRemoveRoute: FastifyPluginAsyncZod<
  ProjectsLibrariesRemoveRouteOptions
> = async (app, opts) => {
  let projectLibraryAssociationsRepository =
    opts.projectLibraryAssociationsRepository;

  function getProjectLibraryAssociationsRepository(): ProjectLibrariesRepository {
    if (!projectLibraryAssociationsRepository) {
      const db = createDb(getDatabaseUrl());
      projectLibraryAssociationsRepository = {
        ...createProjectsRepository(db),
        ...createLibrariesRepository(db),
        ...createProjectLibrariesRepository(db),
      };
    }
    return projectLibraryAssociationsRepository;
  }

  app.delete(
    "/projects/:id/libraries/:libraryId",
    {
      preHandler: createAuthenticateMiddleware(opts.authConfig),
      schema: {
        tags: ["Projects"],
        summary: "Remove a associação de uma biblioteca com o projeto",
        description:
          "Remove a associação entre a biblioteca e o projeto — a biblioteca continua no catálogo global, só deixa de constar nesse projeto. Responde 404 se o projeto não existir ou não pertencer ao usuário autenticado, e também 404 se a biblioteca não estiver associada a esse projeto.",
        security: [{ bearerAuth: [] }],
        params: paramsSchema,
        response: {
          204: z.null().describe("Associação removida com sucesso, sem corpo."),
          404: errorResponseSchema.describe(
            "Projeto não encontrado/de outro usuário, ou biblioteca não associada a esse projeto.",
          ),
        },
      },
    },
    async (request, reply) => {
      try {
        await removeLibraryFromProject(
          getProjectLibraryAssociationsRepository(),
          {
            userId: request.user.id,
            projectId: request.params.id,
            libraryId: request.params.libraryId,
          },
        );
        return reply.status(204).send(null);
      } catch (error) {
        if (error instanceof ProjectNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        if (error instanceof ProjectLibraryNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        throw error;
      }
    },
  );
};
