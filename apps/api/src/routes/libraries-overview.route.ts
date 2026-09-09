import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { createDb, getDatabaseUrl } from "@devlib/db";
import {
  listLibrariesOverview,
  type LibrariesOverviewRepository,
} from "../services/libraries.service";
import { createLibrariesRepository } from "../repositories/libraries.repository";
import { createAuthenticateMiddleware } from "../middleware/authenticate";
import type { AuthConfig } from "../config/env";

const libraryOverviewResponseSchema = z.object({
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
    .describe("Notas livres, ou null quando não informadas."),
  createdAt: z.date().describe("Data/hora de criação da biblioteca."),
  updatedAt: z
    .date()
    .describe("Data/hora da última atualização da biblioteca."),
  projectsCount: z
    .number()
    .int()
    .describe(
      "Quantidade de projetos do usuário autenticado que usam essa biblioteca.",
    ),
});

export type LibrariesOverviewRouteOptions = {
  librariesOverviewRepository?: LibrariesOverviewRepository;
  authConfig?: AuthConfig;
};

export const librariesOverviewRoute: FastifyPluginAsyncZod<
  LibrariesOverviewRouteOptions
> = async (app, opts) => {
  let librariesOverviewRepository = opts.librariesOverviewRepository;

  function getLibrariesOverviewRepository(): LibrariesOverviewRepository {
    if (!librariesOverviewRepository) {
      const db = createDb(getDatabaseUrl());
      librariesOverviewRepository = createLibrariesRepository(db);
    }
    return librariesOverviewRepository;
  }

  app.get(
    "/libraries/overview",
    {
      preHandler: createAuthenticateMiddleware(opts.authConfig),
      schema: {
        tags: ["Libraries"],
        summary: "Lista as bibliotecas do catálogo com contagem de uso",
        description:
          "Retorna todas as bibliotecas do catálogo global, cada uma com projectsCount — a quantidade de projetos do usuário autenticado que a usam. Sem paginação — lista completa em uma única resposta.",
        security: [{ bearerAuth: [] }],
        response: {
          200: z
            .array(libraryOverviewResponseSchema)
            .describe(
              "Lista de bibliotecas do catálogo, em nenhuma ordem garantida. Array vazio quando o catálogo ainda está vazio.",
            ),
        },
      },
    },
    async (request, reply) => {
      const items = await listLibrariesOverview(
        getLibrariesOverviewRepository(),
        request.user.id,
      );
      return reply.status(200).send(items);
    },
  );
};
