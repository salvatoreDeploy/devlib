import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { createDb, getDatabaseUrl } from "@devlib/db";
import {
  listProjectLibraries,
  ProjectNotFoundError,
  type ProjectLibrariesRepository,
} from "../services/projects.service";
import { createProjectsRepository } from "../repositories/projects.repository";
import { createLibrariesRepository } from "../repositories/libraries.repository";
import { createAuthenticateMiddleware } from "../middleware/authenticate";
import type { AuthConfig } from "../config/env";

const projectParamsSchema = z.object({
  id: z.string().min(1).describe("Identificador (UUID) do projeto."),
});

const projectLibraryResponseSchema = z.object({
  id: z.string().describe("Identificador (UUID) da biblioteca."),
  name: z.string().describe("Nome da biblioteca."),
  categoryId: z
    .string()
    .nullable()
    .describe(
      "Identificador (UUID) da categoria, ou null quando não informada.",
    ),
  notes: z
    .string()
    .nullable()
    .describe("Notas livres da biblioteca, ou null quando não informadas."),
  version: z
    .string()
    .nullable()
    .describe(
      "Versão usada nesse projeto, ou null quando não informada na associação.",
    ),
  createdAt: z.date().describe("Data/hora de criação da biblioteca."),
  updatedAt: z
    .date()
    .describe("Data/hora da última atualização da biblioteca."),
});

const errorResponseSchema = z.object({
  error: z.string().describe("Mensagem de erro legível."),
});

export type ProjectsLibrariesListRouteOptions = {
  projectsLibrariesRepository?: ProjectLibrariesRepository;
  authConfig?: AuthConfig;
};

export const projectsLibrariesListRoute: FastifyPluginAsyncZod<
  ProjectsLibrariesListRouteOptions
> = async (app, opts) => {
  let projectsLibrariesRepository = opts.projectsLibrariesRepository;

  function getProjectsLibrariesRepository(): ProjectLibrariesRepository {
    if (!projectsLibrariesRepository) {
      const db = createDb(getDatabaseUrl());
      projectsLibrariesRepository = {
        ...createProjectsRepository(db),
        ...createLibrariesRepository(db),
      };
    }
    return projectsLibrariesRepository;
  }

  app.get(
    "/projects/:id/libraries",
    {
      preHandler: createAuthenticateMiddleware(opts.authConfig),
      schema: {
        tags: ["Projects"],
        summary: "Lista as bibliotecas associadas a um projeto",
        description:
          "Retorna as bibliotecas associadas a um projeto, desde que ele pertença ao usuário autenticado, incluindo a versão registrada na associação. Se o id não existir OU existir mas pertencer a outro usuário, responde 404 nos dois casos, sem diferenciar. Sem paginação — lista completa em uma única resposta.",
        security: [{ bearerAuth: [] }],
        params: projectParamsSchema,
        response: {
          200: z
            .array(projectLibraryResponseSchema)
            .describe(
              "Lista de bibliotecas associadas ao projeto, em nenhuma ordem garantida. Array vazio quando o projeto ainda não tem bibliotecas associadas.",
            ),
          404: errorResponseSchema.describe(
            "Projeto não encontrado, ou encontrado mas de outro usuário.",
          ),
        },
      },
    },
    async (request, reply) => {
      try {
        const items = await listProjectLibraries(
          getProjectsLibrariesRepository(),
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
