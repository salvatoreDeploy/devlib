import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { createDb, getDatabaseUrl } from "@devlib/db";
import {
  deleteLibrary,
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

const errorResponseSchema = z.object({
  error: z.string().describe("Mensagem de erro legível."),
});

export type LibrariesDeleteRouteOptions = {
  librariesRepository?: LibrariesRepository;
  authConfig?: AuthConfig;
};

export const librariesDeleteRoute: FastifyPluginAsyncZod<
  LibrariesDeleteRouteOptions
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

  app.delete(
    "/libraries/:id",
    {
      preHandler: createAuthenticateMiddleware(opts.authConfig),
      schema: {
        tags: ["Libraries"],
        summary: "Exclui uma biblioteca",
        description:
          "Exclui definitivamente uma biblioteca do catálogo global (exclusão física, sem soft-delete). Responde 404 se não existir. Como `project_libraries` e `library_tags` referenciam `libraries` com `onDelete: cascade`, qualquer associação dessa biblioteca com projetos ou tags é excluída junto.",
        security: [{ bearerAuth: [] }],
        params: libraryParamsSchema,
        response: {
          204: z.null().describe("Biblioteca excluída com sucesso, sem corpo."),
          404: errorResponseSchema.describe("Biblioteca não encontrada."),
        },
      },
    },
    async (request, reply) => {
      try {
        await deleteLibrary(getLibrariesRepository(), request.params.id);
        return reply.status(204).send(null);
      } catch (error) {
        if (error instanceof LibraryNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        throw error;
      }
    },
  );
};
