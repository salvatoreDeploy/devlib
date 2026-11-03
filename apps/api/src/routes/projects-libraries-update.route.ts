import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { createDb, getDatabaseUrl } from "@devlib/db";
import {
  updateProjectLibrary,
  CategoryNotFoundError,
  ProjectLibraryNotFoundError,
  ProjectNotFoundError,
  type ProjectLibrariesRepository,
} from "../services/project-libraries.service";
import { createProjectsRepository } from "../repositories/projects.repository";
import { createLibrariesRepository } from "../repositories/libraries.repository";
import { createProjectLibrariesRepository } from "../repositories/project-libraries.repository";
import { createCategoriesRepository } from "../repositories/categories.repository";
import { createAuthenticateMiddleware } from "../middleware/authenticate";
import type { AuthConfig } from "../config/env";

const paramsSchema = z.object({
  id: z.string().min(1).describe("Identificador (UUID) do projeto."),
  libraryId: z
    .string()
    .min(1)
    .describe("Identificador (UUID) da biblioteca associada."),
});

const updateProjectLibraryBodySchema = z
  .object({
    version: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .nullable()
      .optional()
      .describe(
        "Nova versão usada nesse projeto (ex: `19.0.0`), ou null pra limpar. Opcional (omitir mantém a atual). Espaços nas pontas são removidos; vazia ou só espaços é rejeitada.",
      ),
    categoryId: z
      .string()
      .min(1)
      .nullable()
      .optional()
      .describe(
        "Categoria da biblioteca neste projeto: uma global ou do próprio projeto. null volta ao padrão (categoria global da biblioteca). Opcional (omitir mantém a atual).",
      ),
  })
  .refine(
    (body) => body.version !== undefined || body.categoryId !== undefined,
    { message: "Informe version e/ou categoryId" },
  );

const projectLibraryResponseSchema = z.object({
  id: z.string().describe("Identificador (UUID) da associação."),
  projectId: z.string().describe("Identificador (UUID) do projeto."),
  libraryId: z.string().describe("Identificador (UUID) da biblioteca."),
  version: z
    .string()
    .nullable()
    .describe("Versão usada nesse projeto, ou null quando não informada."),
  categoryId: z
    .string()
    .nullable()
    .describe(
      "Categoria da biblioteca neste projeto (global ou do próprio projeto), ou null quando o projeto usa a categoria global da biblioteca.",
    ),
  createdAt: z.date().describe("Data/hora de criação da associação."),
});

const errorResponseSchema = z.object({
  error: z.string().describe("Mensagem de erro legível."),
});

export type ProjectsLibrariesUpdateRouteOptions = {
  projectLibraryAssociationsRepository?: ProjectLibrariesRepository;
  authConfig?: AuthConfig;
};

export const projectsLibrariesUpdateRoute: FastifyPluginAsyncZod<
  ProjectsLibrariesUpdateRouteOptions
> = async (app, opts) => {
  let projectLibraryAssociationsRepository =
    opts.projectLibraryAssociationsRepository;

  function getProjectLibraryAssociationsRepository(): ProjectLibrariesRepository {
    if (!projectLibraryAssociationsRepository) {
      const db = createDb(getDatabaseUrl());
      projectLibraryAssociationsRepository = {
        ...createProjectsRepository(db),
        ...createLibrariesRepository(db),
        ...createProjectLibrariesRepository(db),
        ...createCategoriesRepository(db),
      };
    }
    return projectLibraryAssociationsRepository;
  }

  app.patch(
    "/projects/:id/libraries/:libraryId",
    {
      preHandler: createAuthenticateMiddleware(opts.authConfig),
      schema: {
        tags: ["Projects"],
        summary: "Edita a versão e/ou a categoria de uma biblioteca no projeto",
        description:
          "Troca a versão e/ou a categoria registradas na associação entre a biblioteca e o projeto — pelo menos um dos dois campos. `null` limpa a versão; em `categoryId`, volta a usar a categoria global da biblioteca. A categoria precisa ser global ou do próprio projeto. Responde 404 se o projeto não existir ou não pertencer ao usuário autenticado, se a biblioteca não estiver associada a esse projeto, ou se a categoria não existir/for de outro projeto.",
        security: [{ bearerAuth: [] }],
        params: paramsSchema,
        body: updateProjectLibraryBodySchema,
        response: {
          200: projectLibraryResponseSchema.describe(
            "Associação atualizada com sucesso.",
          ),
          404: errorResponseSchema.describe(
            "Projeto não encontrado/de outro usuário, biblioteca não associada a esse projeto, ou categoria inexistente/de outro projeto.",
          ),
        },
      },
    },
    async (request, reply) => {
      try {
        const projectLibrary = await updateProjectLibrary(
          getProjectLibraryAssociationsRepository(),
          {
            userId: request.user.id,
            projectId: request.params.id,
            libraryId: request.params.libraryId,
            version: request.body.version,
            categoryId: request.body.categoryId,
          },
        );
        return reply.status(200).send(projectLibrary);
      } catch (error) {
        if (error instanceof ProjectNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        if (error instanceof ProjectLibraryNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        if (error instanceof CategoryNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        throw error;
      }
    },
  );
};
