import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { createDb, getDatabaseUrl } from "@devlib/db";
import {
  associateLibraryToProject,
  LibraryNotFoundError,
  ProjectLibraryAlreadyExistsError,
  ProjectNotFoundError,
  type ProjectLibrariesRepository,
} from "../services/project-libraries.service";
import { createProjectsRepository } from "../repositories/projects.repository";
import { createLibrariesRepository } from "../repositories/libraries.repository";
import { createProjectLibrariesRepository } from "../repositories/project-libraries.repository";
import { createAuthenticateMiddleware } from "../middleware/authenticate";
import type { AuthConfig } from "../config/env";

const projectParamsSchema = z.object({
  id: z.string().min(1).describe("Identificador (UUID) do projeto."),
});

const associateLibraryBodySchema = z.object({
  libraryId: z
    .string()
    .min(1)
    .describe("Identificador (UUID) da biblioteca do catálogo a associar."),
  version: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .describe(
      "Versão usada nesse projeto (ex: `18.3.1`). Opcional — omitir grava null. Espaços nas pontas são removidos; vazia ou só espaços é rejeitada.",
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

export type ProjectsLibrariesAssociateRouteOptions = {
  projectLibraryAssociationsRepository?: ProjectLibrariesRepository;
  authConfig?: AuthConfig;
};

export const projectsLibrariesAssociateRoute: FastifyPluginAsyncZod<
  ProjectsLibrariesAssociateRouteOptions
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

  app.post(
    "/projects/:id/libraries",
    {
      preHandler: createAuthenticateMiddleware(opts.authConfig),
      schema: {
        tags: ["Projects"],
        summary: "Associa uma biblioteca a um projeto",
        description:
          "Associa uma biblioteca do catálogo global ao projeto, com a versão usada nele (opcional). Responde 404 se o projeto não existir ou não pertencer ao usuário autenticado, também 404 se a biblioteca não existir, e 409 se a biblioteca já estiver associada a esse projeto — a versão existente não é alterada.",
        security: [{ bearerAuth: [] }],
        params: projectParamsSchema,
        body: associateLibraryBodySchema,
        response: {
          201: projectLibraryResponseSchema.describe(
            "Associação criada com sucesso.",
          ),
          404: errorResponseSchema.describe(
            "Projeto não encontrado/de outro usuário, ou biblioteca não encontrada.",
          ),
          409: errorResponseSchema.describe(
            "A biblioteca já está associada a esse projeto.",
          ),
        },
      },
    },
    async (request, reply) => {
      try {
        const projectLibrary = await associateLibraryToProject(
          getProjectLibraryAssociationsRepository(),
          {
            userId: request.user.id,
            projectId: request.params.id,
            libraryId: request.body.libraryId,
            version: request.body.version,
          },
        );
        return reply.status(201).send(projectLibrary);
      } catch (error) {
        if (error instanceof ProjectNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        if (error instanceof LibraryNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        if (error instanceof ProjectLibraryAlreadyExistsError) {
          return reply.status(409).send({ error: error.message });
        }
        throw error;
      }
    },
  );
};
