import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { createDb, getDatabaseUrl } from "@devlib/db";
import {
  createLibrary,
  LibraryNameAlreadyExistsError,
  CategoryNotFoundError,
  type LibrariesRepository,
} from "../services/libraries.service";
import { createLibrariesRepository } from "../repositories/libraries.repository";
import { createCategoriesRepository } from "../repositories/categories.repository";
import { createAuthenticateMiddleware } from "../middleware/authenticate";
import type { AuthConfig } from "../config/env";

const createLibraryBodySchema = z.object({
  name: z
    .string()
    .min(1)
    .describe(
      "Nome da biblioteca. Deve ser único no catálogo (compartilhado por todos os usuários).",
    ),
  categoryId: z
    .string()
    .min(1)
    .optional()
    .describe("Identificador (UUID) da categoria. Opcional."),
  notes: z.string().min(1).optional().describe("Notas livres. Opcional."),
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

export type LibrariesCreateRouteOptions = {
  librariesRepository?: LibrariesRepository;
  authConfig?: AuthConfig;
};

export const librariesCreateRoute: FastifyPluginAsyncZod<
  LibrariesCreateRouteOptions
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

  app.post(
    "/libraries",
    {
      preHandler: createAuthenticateMiddleware(opts.authConfig),
      schema: {
        tags: ["Libraries"],
        summary: "Cria uma biblioteca",
        description:
          "Cria uma biblioteca no catálogo global (compartilhado por todos os usuários autenticados). Retorna 409 se já existir uma biblioteca com o mesmo nome, e 404 se o `categoryId` informado não existir.",
        security: [{ bearerAuth: [] }],
        body: createLibraryBodySchema,
        response: {
          201: libraryResponseSchema.describe("Biblioteca criada com sucesso."),
          404: errorResponseSchema.describe(
            "O `categoryId` informado não corresponde a nenhuma categoria existente.",
          ),
          409: errorResponseSchema.describe(
            "Já existe uma biblioteca com esse nome no catálogo.",
          ),
        },
      },
    },
    async (request, reply) => {
      try {
        const library = await createLibrary(
          getLibrariesRepository(),
          request.body,
        );
        return reply.status(201).send(library);
      } catch (error) {
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
