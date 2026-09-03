import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { createDb, getDatabaseUrl } from "@devlib/db";
import {
  getLibrary,
  LibraryNotFoundError,
  type LibrariesRepository,
} from "../services/libraries.service";
import { createLibrariesRepository } from "../repositories/libraries.repository";
import { createCategoriesRepository } from "../repositories/categories.repository";
import { createAuthenticateMiddleware } from "../middleware/authenticate";
import type { AuthConfig } from "../config/env";

const libraryParamsSchema = z.object({
  id: z.string().min(1).describe("Identificador (UUID) da biblioteca."),
});

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

const errorResponseSchema = z.object({
  error: z.string().describe("Mensagem de erro legível."),
});

export type LibrariesGetRouteOptions = {
  librariesRepository?: LibrariesRepository;
  authConfig?: AuthConfig;
};

export const librariesGetRoute: FastifyPluginAsyncZod<
  LibrariesGetRouteOptions
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
    "/libraries/:id",
    {
      preHandler: createAuthenticateMiddleware(opts.authConfig),
      schema: {
        tags: ["Libraries"],
        summary: "Detalha uma biblioteca",
        description:
          "Retorna uma biblioteca do catálogo global pelo id. Responde 404 se não existir.",
        security: [{ bearerAuth: [] }],
        params: libraryParamsSchema,
        response: {
          200: libraryResponseSchema.describe("Biblioteca encontrada."),
          404: errorResponseSchema.describe("Biblioteca não encontrada."),
        },
      },
    },
    async (request, reply) => {
      try {
        const library = await getLibrary(
          getLibrariesRepository(),
          request.params.id,
        );
        return reply.status(200).send(library);
      } catch (error) {
        if (error instanceof LibraryNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        throw error;
      }
    },
  );
};
