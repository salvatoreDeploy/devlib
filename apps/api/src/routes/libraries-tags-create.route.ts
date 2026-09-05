import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { createDb, getDatabaseUrl } from "@devlib/db";
import {
  addTagToLibrary,
  LibraryNotFoundError,
  TagAlreadyAssociatedError,
  type TagsRepository,
} from "../services/tags.service";
import { createTagsRepository } from "../repositories/tags.repository";
import { createLibrariesRepository } from "../repositories/libraries.repository";
import { createAuthenticateMiddleware } from "../middleware/authenticate";
import type { AuthConfig } from "../config/env";

const libraryParamsSchema = z.object({
  id: z.string().min(1).describe("Identificador (UUID) da biblioteca."),
});

const addTagBodySchema = z.object({
  name: z
    .string()
    .min(1)
    .describe(
      "Nome da tag. Reaproveitada se já existir no catálogo (compartilhado por todas as bibliotecas), ou criada na hora.",
    ),
});

const tagResponseSchema = z.object({
  id: z.string().describe("Identificador (UUID) da tag."),
  name: z.string().describe("Nome da tag."),
  createdAt: z.date().describe("Data/hora de criação da tag."),
});

const errorResponseSchema = z.object({
  error: z.string().describe("Mensagem de erro legível."),
});

export type LibrariesTagsCreateRouteOptions = {
  tagsRepository?: TagsRepository;
  authConfig?: AuthConfig;
};

export const librariesTagsCreateRoute: FastifyPluginAsyncZod<
  LibrariesTagsCreateRouteOptions
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

  app.post(
    "/libraries/:id/tags",
    {
      preHandler: createAuthenticateMiddleware(opts.authConfig),
      schema: {
        tags: ["Tags"],
        summary: "Cria e/ou associa uma tag a uma biblioteca",
        description:
          "Associa uma tag a uma biblioteca do catálogo. Se já existir uma tag com o nome informado, ela é reaproveitada (tags são globais, compartilhadas entre bibliotecas); caso contrário, é criada. Responde 404 se a biblioteca não existir, e 409 se a tag já estiver associada a essa biblioteca.",
        security: [{ bearerAuth: [] }],
        params: libraryParamsSchema,
        body: addTagBodySchema,
        response: {
          201: tagResponseSchema.describe("Tag criada/associada com sucesso."),
          404: errorResponseSchema.describe("Biblioteca não encontrada."),
          409: errorResponseSchema.describe(
            "A tag já está associada a essa biblioteca.",
          ),
        },
      },
    },
    async (request, reply) => {
      try {
        const tag = await addTagToLibrary(
          getTagsRepository(),
          request.params.id,
          request.body.name,
        );
        return reply.status(201).send(tag);
      } catch (error) {
        if (error instanceof LibraryNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        if (error instanceof TagAlreadyAssociatedError) {
          return reply.status(409).send({ error: error.message });
        }
        throw error;
      }
    },
  );
};
