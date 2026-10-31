import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { createDb, getDatabaseUrl } from "@devlib/db";
import {
  updateProjectLibraryVersion,
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

const updateVersionBodySchema = z.object({
  version: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .nullable()
    .describe(
      "Nova versão usada nesse projeto (ex: `19.0.0`), ou null pra limpar. Obrigatório — é o único campo editável da associação. Espaços nas pontas são removidos; vazia ou só espaços é rejeitada.",
    ),
});

const projectLibraryResponseSchema = z.object({
  id: z.string().describe("Identificador (UUID) da associação."),
  projectId: z.string().describe("Identificador (UUID) do projeto."),
  libraryId: z.string().describe("Identificador (UUID) da biblioteca."),
  version: z
    .string()
    .nullable()
    .describe("Versão usada nesse projeto, ou null quando não informada."),
  createdAt: z.date().describe("Data/hora de criação da associação."),
});

const errorResponseSchema = z.object({
  error: z.string().describe("Mensagem de erro legível."),
});

export type ProjectsLibrariesUpdateRouteOptions = {
  projectLibraryAssociationsRepository?: ProjectLibrariesRepository;
  authConfig?: AuthConfig;
};

export const projectsLibrariesUpdateRoute: FastifyPluginAsyncZod<
  ProjectsLibrariesUpdateRouteOptions
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

  app.patch(
    "/projects/:id/libraries/:libraryId",
    {
      preHandler: createAuthenticateMiddleware(opts.authConfig),
      schema: {
        tags: ["Projects"],
        summary: "Edita a versão de uma biblioteca no projeto",
        description:
          "Troca a versão registrada na associação entre a biblioteca e o projeto (`null` limpa a versão). Responde 404 se o projeto não existir ou não pertencer ao usuário autenticado, e também 404 se a biblioteca não estiver associada a esse projeto.",
        security: [{ bearerAuth: [] }],
        params: paramsSchema,
        body: updateVersionBodySchema,
        response: {
          200: projectLibraryResponseSchema.describe(
            "Associação atualizada com sucesso.",
          ),
          404: errorResponseSchema.describe(
            "Projeto não encontrado/de outro usuário, ou biblioteca não associada a esse projeto.",
          ),
        },
      },
    },
    async (request, reply) => {
      try {
        const projectLibrary = await updateProjectLibraryVersion(
          getProjectLibraryAssociationsRepository(),
          {
            userId: request.user.id,
            projectId: request.params.id,
            libraryId: request.params.libraryId,
            version: request.body.version,
          },
        );
        return reply.status(200).send(projectLibrary);
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
