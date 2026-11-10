import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { createDb, getDatabaseUrl } from "@devlib/db";
import {
  importLibrariesToProject,
  ProjectLibrariesImportConflictError,
  ProjectNotFoundError,
  type ImportLibrariesRepository,
  type ProjectLibrariesImportRepository,
} from "../services/project-libraries-import.service";
import { createProjectsRepository } from "../repositories/projects.repository";
import {
  createLibrariesRepository,
  type DbClient,
} from "../repositories/libraries.repository";
import { createProjectLibrariesRepository } from "../repositories/project-libraries.repository";
import { createAuthenticateMiddleware } from "../middleware/authenticate";
import type { AuthConfig } from "../config/env";

export const IMPORT_MAX_ITEMS = 500;

const projectParamsSchema = z.object({
  id: z.string().min(1).describe("Identificador (UUID) do projeto."),
});

const importItemSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(214)
    .describe(
      "Nome da biblioteca (ex: `react`). Comparado de forma exata com o catálogo, após remover espaços nas pontas.",
    ),
  version: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .describe(
      "Versão usada no projeto (ex: `^18.3.1`), gravada como veio. Opcional — omitida grava null numa associação nova e nunca apaga a versão de uma associação existente.",
    ),
});

const importBodySchema = z.object({
  items: z
    .array(importItemSchema)
    .min(1)
    .max(IMPORT_MAX_ITEMS)
    .superRefine((items, ctx) => {
      const seen = new Set<string>();
      for (const [index, item] of items.entries()) {
        if (seen.has(item.name)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [index, "name"],
            message: `Biblioteca "${item.name}" repetida na lista`,
          });
          return;
        }
        seen.add(item.name);
      }
    })
    .describe(
      `Lista genérica de bibliotecas a importar (1 a ${IMPORT_MAX_ITEMS}, nomes únicos).`,
    ),
  dryRun: z
    .boolean()
    .default(false)
    .describe(
      "true: só classifica cada item, sem gravar nada (prévia). false (padrão): aplica tudo numa transação.",
    ),
});

const importActionSchema = z
  .enum(["create", "associate", "updateVersion", "unchanged"])
  .describe(
    "`create`: nova no catálogo (criada sem categoria) e associada; `associate`: já no catálogo, associada ao projeto; `updateVersion`: já associada, versão atualizada; `unchanged`: já associada com a mesma versão (ou item sem versão).",
  );

const importReportSchema = z.object({
  dryRun: z.boolean().describe("Se a resposta é só uma prévia."),
  summary: z
    .object({
      create: z.number(),
      associate: z.number(),
      updateVersion: z.number(),
      unchanged: z.number(),
    })
    .describe("Quantidade de itens por ação."),
  items: z.array(
    z.object({
      name: z.string().describe("Nome da biblioteca."),
      version: z
        .string()
        .nullable()
        .describe("Versão informada no item, ou null quando omitida."),
      action: importActionSchema,
      libraryId: z
        .string()
        .nullable()
        .describe(
          "Identificador da biblioteca no catálogo — null só em `create` no dryRun.",
        ),
      previousVersion: z
        .string()
        .nullable()
        .describe(
          "Versão atual no projeto antes da importação, ou null quando não associada/sem versão.",
        ),
    }),
  ),
});

const errorResponseSchema = z.object({
  error: z.string().describe("Mensagem de erro legível."),
});

// mesma montagem nos dois lados da transação: fora (leitura do projeto e
// dryRun) e dentro (repositórios ligados ao tx do drizzle)
function createImportLibrariesRepository(
  db: DbClient,
): ImportLibrariesRepository {
  return {
    ...createLibrariesRepository(db),
    ...createProjectLibrariesRepository(db),
  };
}

export function createProjectLibrariesImportRepository(
  db: ReturnType<typeof createDb>,
): ProjectLibrariesImportRepository {
  return {
    ...createProjectsRepository(db),
    ...createImportLibrariesRepository(db),
    transaction: (fn) =>
      db.transaction((tx) => fn(createImportLibrariesRepository(tx))),
  };
}

export type ProjectsLibrariesImportRouteOptions = {
  projectLibrariesImportRepository?: ProjectLibrariesImportRepository;
  authConfig?: AuthConfig;
};

export const projectsLibrariesImportRoute: FastifyPluginAsyncZod<
  ProjectsLibrariesImportRouteOptions
> = async (app, opts) => {
  let projectLibrariesImportRepository = opts.projectLibrariesImportRepository;

  function getProjectLibrariesImportRepository(): ProjectLibrariesImportRepository {
    projectLibrariesImportRepository ??= createProjectLibrariesImportRepository(
      createDb(getDatabaseUrl()),
    );
    return projectLibrariesImportRepository;
  }

  app.post(
    "/projects/:id/libraries/import",
    {
      preHandler: createAuthenticateMiddleware(opts.authConfig),
      schema: {
        tags: ["Projects"],
        summary: "Importa uma lista de bibliotecas para o projeto",
        description:
          "Recebe uma lista genérica `{ name, version? }[]` (ex: gerada a partir de um `package.json` pelo web) e, por item: cria a biblioteca no catálogo se não existir (sem categoria), associa ao projeto se ainda não estiver associada, ou atualiza a versão da associação existente. Com `dryRun: true` só devolve a classificação, sem gravar nada; sem `dryRun`, aplica tudo numa única transação (ou nada) e devolve o mesmo relatório. Responde 404 se o projeto não existir ou não pertencer ao usuário autenticado, e 409 se outra requisição alterar o catálogo/projeto no meio da importação.",
        security: [{ bearerAuth: [] }],
        params: projectParamsSchema,
        body: importBodySchema,
        response: {
          200: importReportSchema.describe(
            "Relatório da importação (prévia quando `dryRun: true`).",
          ),
          404: errorResponseSchema.describe(
            "Projeto não encontrado ou de outro usuário.",
          ),
          409: errorResponseSchema.describe(
            "Conflito com outra requisição simultânea — nada foi gravado.",
          ),
        },
      },
    },
    async (request, reply) => {
      try {
        const report = await importLibrariesToProject(
          getProjectLibrariesImportRepository(),
          {
            userId: request.user.id,
            projectId: request.params.id,
            items: request.body.items,
            dryRun: request.body.dryRun,
          },
        );
        return reply.status(200).send(report);
      } catch (error) {
        if (error instanceof ProjectNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        if (error instanceof ProjectLibrariesImportConflictError) {
          return reply.status(409).send({ error: error.message });
        }
        throw error;
      }
    },
  );
};
