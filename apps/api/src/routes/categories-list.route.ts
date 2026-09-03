import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { createDb, getDatabaseUrl } from "@devlib/db";
import {
  listCategories,
  type CategoriesRepository,
} from "../services/categories.service";
import { createCategoriesRepository } from "../repositories/categories.repository";
import { createAuthenticateMiddleware } from "../middleware/authenticate";
import type { AuthConfig } from "../config/env";

const categoryResponseSchema = z.object({
  id: z.string().describe("Identificador (UUID) da categoria."),
  projectId: z
    .string()
    .nullable()
    .describe(
      "Identificador (UUID) do projeto dono da categoria, ou null quando é uma categoria global/predefinida.",
    ),
  name: z.string().describe("Nome da categoria."),
  createdAt: z.date().describe("Data/hora de criação da categoria."),
});

export type CategoriesListRouteOptions = {
  categoriesRepository?: CategoriesRepository;
  authConfig?: AuthConfig;
};

export const categoriesListRoute: FastifyPluginAsyncZod<
  CategoriesListRouteOptions
> = async (app, opts) => {
  let categoriesRepository = opts.categoriesRepository;

  function getCategoriesRepository(): CategoriesRepository {
    if (!categoriesRepository) {
      categoriesRepository = createCategoriesRepository(
        createDb(getDatabaseUrl()),
      );
    }
    return categoriesRepository;
  }

  app.get(
    "/categories",
    {
      preHandler: createAuthenticateMiddleware(opts.authConfig),
      schema: {
        tags: ["Categories"],
        summary: "Lista as categorias globais",
        description:
          "Retorna as categorias globais/predefinidas do catálogo (`projectId: null`). Não inclui categorias específicas de um projeto — hoje não há como criar uma. Sem paginação — lista completa em uma única resposta.",
        security: [{ bearerAuth: [] }],
        response: {
          200: z
            .array(categoryResponseSchema)
            .describe(
              "Lista de categorias globais, em nenhuma ordem garantida.",
            ),
        },
      },
    },
    async (_request, reply) => {
      const items = await listCategories(getCategoriesRepository());
      return reply.status(200).send(items);
    },
  );
};
