import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { createDb, getDatabaseUrl } from "@devlib/db";
import {
  listLibraryProjects,
  LibraryNotFoundError,
  type LibraryProjectsRepository,
} from "../services/libraries.service";
import { createLibrariesRepository } from "../repositories/libraries.repository";
import { createProjectsRepository } from "../repositories/projects.repository";
import { createCategoriesRepository } from "../repositories/categories.repository";
import { createAuthenticateMiddleware } from "../middleware/authenticate";
import type { AuthConfig } from "../config/env";

const libraryParamsSchema = z.object({
  id: z.string().min(1).describe("Identificador (UUID) da biblioteca."),
});

const libraryProjectResponseSchema = z.object({
  id: z.string().describe("Identificador (UUID) do projeto."),
  userId: z
    .string()
    .describe("Identificador (UUID) do usuário dono do projeto."),
  name: z.string().describe("Nome do projeto."),
  description: z
    .string()
    .nullable()
    .describe("Descrição do projeto, ou null quando não informada."),
  version: z
    .string()
    .nullable()
    .describe(
      "Versão da biblioteca usada nesse projeto, ou null quando não informada na associação.",
    ),
  createdAt: z.date().describe("Data/hora de criação do projeto."),
  updatedAt: z.date().describe("Data/hora da última atualização do projeto."),
});

const errorResponseSchema = z.object({
  error: z.string().describe("Mensagem de erro legível."),
});

export type LibrariesProjectsListRouteOptions = {
  librariesProjectsRepository?: LibraryProjectsRepository;
  authConfig?: AuthConfig;
};

export const librariesProjectsListRoute: FastifyPluginAsyncZod<
  LibrariesProjectsListRouteOptions
> = async (app, opts) => {
  let librariesProjectsRepository = opts.librariesProjectsRepository;

  function getLibrariesProjectsRepository(): LibraryProjectsRepository {
    if (!librariesProjectsRepository) {
      const db = createDb(getDatabaseUrl());
      librariesProjectsRepository = {
        ...createLibrariesRepository(db),
        ...createCategoriesRepository(db),
        ...createProjectsRepository(db),
      };
    }
    return librariesProjectsRepository;
  }

  app.get(
    "/libraries/:id/projects",
    {
      preHandler: createAuthenticateMiddleware(opts.authConfig),
      schema: {
        tags: ["Libraries"],
        summary:
          "Lista os projetos do usuário autenticado que usam uma biblioteca",
        description:
          "Retorna os projetos do usuário autenticado que têm essa biblioteca associada, incluindo a versão registrada em cada associação. Biblioteca não tem dono, então a checagem de 404 é só sobre a existência dela — mas a lista de projetos retornada é sempre restrita ao usuário autenticado, nunca inclui projetos de outros usuários que também usem a mesma biblioteca. Sem paginação — lista completa em uma única resposta.",
        security: [{ bearerAuth: [] }],
        params: libraryParamsSchema,
        response: {
          200: z
            .array(libraryProjectResponseSchema)
            .describe(
              "Lista de projetos do usuário autenticado que usam a biblioteca, em nenhuma ordem garantida. Array vazio quando nenhum projeto do usuário usa essa biblioteca.",
            ),
          404: errorResponseSchema.describe("Biblioteca não encontrada."),
        },
      },
    },
    async (request, reply) => {
      try {
        const items = await listLibraryProjects(
          getLibrariesProjectsRepository(),
          {
            userId: request.user.id,
            libraryId: request.params.id,
          },
        );
        return reply.status(200).send(items);
      } catch (error) {
        if (error instanceof LibraryNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        throw error;
      }
    },
  );
};
