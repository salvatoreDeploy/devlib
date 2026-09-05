import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { createDb, getDatabaseUrl } from "@devlib/db";
import {
  listLibraryTags,
  LibraryNotFoundError,
  type TagsRepository,
} from "../services/tags.service";
import { createTagsRepository } from "../repositories/tags.repository";
import { createLibrariesRepository } from "../repositories/libraries.repository";
import { createAuthenticateMiddleware } from "../middleware/authenticate";
import type { AuthConfig } from "../config/env";

const libraryParamsSchema = z.object({
  id: z.string().min(1).describe("Identificador (UUID) da biblioteca."),
});

const tagResponseSchema = z.object({
  id: z.string().describe("Identificador (UUID) da tag."),
  name: z.string().describe("Nome da tag."),
  createdAt: z.date().describe("Data/hora de criação da tag."),
});

const errorResponseSchema = z.object({
  error: z.string().describe("Mensagem de erro legível."),
});

export type LibrariesTagsListRouteOptions = {
  tagsRepository?: TagsRepository;
  authConfig?: AuthConfig;
};

export const librariesTagsListRoute: FastifyPluginAsyncZod<
  LibrariesTagsListRouteOptions
> = async (app, opts) => {
  let tagsRepository = opts.tagsRepository;

  function getTagsRepository(): TagsRepository {
    if (!tagsRepository) {
      const db = createDb(getDatabaseUrl());
      tagsRepository = {
        ...createTagsRepository(db),
        ...createLibrariesRepository(db),
      };
    }
    return tagsRepository;
  }

  app.get(
    "/libraries/:id/tags",
    {
      preHandler: createAuthenticateMiddleware(opts.authConfig),
      schema: {
        tags: ["Tags"],
        summary: "Lista as tags de uma biblioteca",
        description:
          "Retorna as tags associadas a uma biblioteca do catálogo. Responde 404 se a biblioteca não existir. Sem paginação — lista completa em uma única resposta.",
        security: [{ bearerAuth: [] }],
        params: libraryParamsSchema,
        response: {
          200: z
            .array(tagResponseSchema)
            .describe("Lista de tags associadas, em nenhuma ordem garantida."),
          404: errorResponseSchema.describe("Biblioteca não encontrada."),
        },
      },
    },
    async (request, reply) => {
      try {
        const items = await listLibraryTags(
          getTagsRepository(),
          request.params.id,
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
