import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { createDb, getDatabaseUrl } from "@devlib/db";
import {
  listLibraries,
  type LibrariesRepository,
} from "../services/libraries.service";
import { createLibrariesRepository } from "../repositories/libraries.repository";
import { createCategoriesRepository } from "../repositories/categories.repository";
import { createAuthenticateMiddleware } from "../middleware/authenticate";
import type { AuthConfig } from "../config/env";

const libraryResponseSchema = z.object({
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
});

export type LibrariesListRouteOptions = {
  librariesRepository?: LibrariesRepository;
  authConfig?: AuthConfig;
};

export const librariesListRoute: FastifyPluginAsyncZod<
  LibrariesListRouteOptions
> = async (app, opts) => {
  let librariesRepository = opts.librariesRepository;

  function getLibrariesRepository(): LibrariesRepository {
    if (!librariesRepository) {
      const db = createDb(getDatabaseUrl());
      librariesRepository = {
        ...createLibrariesRepository(db),
        ...createCategoriesRepository(db),
      };
    }
    return librariesRepository;
  }

  app.get(
    "/libraries",
    {
      preHandler: createAuthenticateMiddleware(opts.authConfig),
      schema: {
        tags: ["Libraries"],
        summary: "Lista as bibliotecas do catálogo",
        description:
          "Retorna todas as bibliotecas do catálogo global, compartilhado por todos os usuários autenticados. Sem paginação — lista completa em uma única resposta.",
        security: [{ bearerAuth: [] }],
        response: {
          200: z
            .array(libraryResponseSchema)
            .describe(
              "Lista de bibliotecas do catálogo, em nenhuma ordem garantida. Array vazio quando o catálogo ainda está vazio.",
            ),
        },
      },
    },
    async (_request, reply) => {
      const items = await listLibraries(getLibrariesRepository());
      return reply.status(200).send(items);
    },
  );
};
