import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { createDb, getDatabaseUrl } from "@devlib/db";
import {
  updateLibrary,
  LibraryNotFoundError,
  LibraryNameAlreadyExistsError,
  CategoryNotFoundError,
  type LibrariesRepository,
} from "../services/libraries.service";
import { createLibrariesRepository } from "../repositories/libraries.repository";
import { createCategoriesRepository } from "../repositories/categories.repository";
import { createAuthenticateMiddleware } from "../middleware/authenticate";
import type { AuthConfig } from "../config/env";

const libraryParamsSchema = z.object({
  id: z.string().min(1).describe("Identificador (UUID) da biblioteca."),
});

const updateLibraryBodySchema = z.object({
  name: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Novo nome da biblioteca. Opcional (omitir mantém o atual). Deve continuar único no catálogo.",
    ),
  categoryId: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Novo identificador (UUID) da categoria. Opcional (omitir mantém a atual).",
    ),
  notes: z
    .string()
    .min(1)
    .optional()
    .describe("Novas notas livres. Opcional (omitir mantém as atuais)."),
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

export type LibrariesUpdateRouteOptions = {
  librariesRepository?: LibrariesRepository;
  authConfig?: AuthConfig;
};

export const librariesUpdateRoute: FastifyPluginAsyncZod<
  LibrariesUpdateRouteOptions
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

  app.patch(
    "/libraries/:id",
    {
      preHandler: createAuthenticateMiddleware(opts.authConfig),
      schema: {
        tags: ["Libraries"],
        summary: "Atualiza uma biblioteca (parcial)",
        description:
          "Atualiza nome, categoria e/ou notas de uma biblioteca do catálogo global. Campos omitidos no corpo não são alterados. Responde 404 se a biblioteca não existir ou se o novo `categoryId` não existir; responde 409 se o novo nome já for usado por outra biblioteca (renomear pro próprio nome atual não gera conflito).",
        security: [{ bearerAuth: [] }],
        params: libraryParamsSchema,
        body: updateLibraryBodySchema,
        response: {
          200: libraryResponseSchema.describe("Biblioteca atualizada."),
          404: errorResponseSchema.describe(
            "Biblioteca não encontrada, ou o `categoryId` informado não existe.",
          ),
          409: errorResponseSchema.describe(
            "O novo nome já é usado por outra biblioteca do catálogo.",
          ),
        },
      },
    },
    async (request, reply) => {
      try {
        const library = await updateLibrary(
          getLibrariesRepository(),
          request.params.id,
          request.body,
        );
        return reply.status(200).send(library);
      } catch (error) {
        if (error instanceof LibraryNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        if (error instanceof LibraryNameAlreadyExistsError) {
          return reply.status(409).send({ error: error.message });
        }
        if (error instanceof CategoryNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        throw error;
      }
    },
  );
};
