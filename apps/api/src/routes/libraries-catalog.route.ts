import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { createDb, getDatabaseUrl } from "@devlib/db";
import {
  getCatalogFacets,
  listLibrariesCatalog,
  type CatalogFilters,
  type LibrariesCatalogRepository,
} from "../services/libraries-catalog.service";
import { createLibrariesCatalogRepository } from "../repositories/libraries-catalog.repository";
import { createAuthenticateMiddleware } from "../middleware/authenticate";
import type { AuthConfig } from "../config/env";

const catalogQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(100)
    .optional()
    .describe(
      "Trecho do nome da biblioteca (sem diferenciar maiúsculas; acentos contam). Vazio ou só espaços é ignorado.",
    ),
  categoryId: z
    .union([z.literal("none"), z.string().uuid()])
    .optional()
    .describe(
      "Filtra pela categoria que a Home mostra: a efetiva (do projeto, senão a global) nos projetos do usuário quando a biblioteca é usada por ele; a global quando não é. `none` = sem categoria pela mesma regra.",
    ),
  usage: z
    .enum(["all", "used", "unused"])
    .default("all")
    .describe(
      "`used`: usadas em algum projeto do usuário; `unused`: em nenhum; `all` (padrão): todas.",
    ),
  tagId: z
    .string()
    .uuid()
    .optional()
    .describe("Filtra pelas bibliotecas com essa tag."),
  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(1)
    .describe(
      "Página (1-based, 10 itens por página). Além da última, responde a última.",
    ),
});

const effectiveCategorySchema = z.object({
  id: z
    .string()
    .nullable()
    .describe(
      "Categoria efetiva, ou null pros projetos em que a biblioteca não tem categoria.",
    ),
  name: z.string().nullable().describe("Nome da categoria, ou null."),
  projects: z
    .array(z.object({ id: z.string(), name: z.string() }))
    .describe("Projetos do usuário em que essa categoria se aplica."),
});

const catalogItemSchema = z.object({
  id: z.string().describe("Identificador (UUID) da biblioteca."),
  name: z.string().describe("Nome da biblioteca."),
  categoryId: z
    .string()
    .nullable()
    .describe("Categoria global da biblioteca, ou null."),
  notes: z.string().nullable().describe("Notas livres, ou null."),
  createdAt: z.date().describe("Data/hora de criação da biblioteca."),
  updatedAt: z.date().describe("Data/hora da última atualização."),
  projectsCount: z
    .number()
    .int()
    .describe("Quantidade de projetos do usuário que usam essa biblioteca."),
  effectiveCategories: z
    .array(effectiveCategorySchema)
    .describe(
      "Categorias efetivas distintas nos projetos do usuário, por nome (sem categoria por último). Vazio quando o usuário não usa a biblioteca — vale a categoria global.",
    ),
});

const catalogResponseSchema = z.object({
  items: z.array(catalogItemSchema),
  total: z.number().int().describe("Total de bibliotecas com esses filtros."),
  page: z.number().int().describe("Página devolvida (ajustada à última)."),
  pageSize: z.number().int().describe("Itens por página (fixo em 10)."),
});

const facetsResponseSchema = z.object({
  categories: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        projectId: z
          .string()
          .nullable()
          .describe("Projeto da categoria, ou null pra categoria global."),
        projectName: z
          .string()
          .nullable()
          .describe("Nome do projeto (desambigua nomes repetidos), ou null."),
      }),
    )
    .describe(
      "Categorias que a coluna da Home mostra pra alguma biblioteca do catálogo (efetiva nos projetos do usuário, global nas que ele não usa): globais por nome, depois as de projeto por projeto e nome.",
    ),
  hasUncategorized: z
    .boolean()
    .describe("Se o filtro `categoryId=none` tem resultado."),
  tags: z
    .array(z.object({ id: z.string(), name: z.string() }))
    .describe("Tags com ao menos uma biblioteca, por nome."),
});

export type LibrariesCatalogRouteOptions = {
  librariesCatalogRepository?: LibrariesCatalogRepository;
  authConfig?: AuthConfig;
};

export const librariesCatalogRoute: FastifyPluginAsyncZod<
  LibrariesCatalogRouteOptions
> = async (app, opts) => {
  let librariesCatalogRepository = opts.librariesCatalogRepository;

  function getLibrariesCatalogRepository(): LibrariesCatalogRepository {
    librariesCatalogRepository ??= createLibrariesCatalogRepository(
      createDb(getDatabaseUrl()),
    );
    return librariesCatalogRepository;
  }

  app.get(
    "/libraries/catalog",
    {
      preHandler: createAuthenticateMiddleware(opts.authConfig),
      schema: {
        tags: ["Libraries"],
        summary:
          "Lista o catálogo de bibliotecas com busca, filtros e paginação",
        description:
          "Catálogo global de bibliotecas, ordenado por nome, 10 por página, com busca (`q`), filtros (`categoryId`, `usage`, `tagId`) e, por biblioteca, `projectsCount` e as categorias efetivas — ambos contados só nos projetos do usuário autenticado.",
        security: [{ bearerAuth: [] }],
        querystring: catalogQuerySchema,
        response: {
          200: catalogResponseSchema.describe("Página do catálogo."),
        },
      },
    },
    async (request, reply) => {
      const { q, categoryId, usage, tagId, page } = request.query;
      // só as chaves informadas (q vazio após trim é ignorado)
      const filters: CatalogFilters = {
        ...(q && { q }),
        ...(categoryId && { categoryId }),
        usage,
        ...(tagId && { tagId }),
      };

      const result = await listLibrariesCatalog(
        getLibrariesCatalogRepository(),
        request.user.id,
        { filters, page },
      );
      return reply.status(200).send(result);
    },
  );

  app.get(
    "/libraries/catalog/facets",
    {
      preHandler: createAuthenticateMiddleware(opts.authConfig),
      schema: {
        tags: ["Libraries"],
        summary: "Opções dos filtros do catálogo",
        description:
          "Categorias, 'sem categoria' e tags que dá pra usar como filtro em `GET /libraries/catalog` sem zerar o resultado — pela mesma regra do filtro de categoria. Categorias de projetos de outros usuários nunca aparecem.",
        security: [{ bearerAuth: [] }],
        response: {
          200: facetsResponseSchema.describe("Opções de filtro."),
        },
      },
    },
    async (request, reply) => {
      const facets = await getCatalogFacets(
        getLibrariesCatalogRepository(),
        request.user.id,
      );
      return reply.status(200).send(facets);
    },
  );
};
