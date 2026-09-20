import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { createDb, getDatabaseUrl } from "@devlib/db";
import {
  listProjectsOverview,
  type ProjectsOverviewRepository,
} from "../services/projects.service";
import { createProjectsRepository } from "../repositories/projects.repository";
import { createAuthenticateMiddleware } from "../middleware/authenticate";
import type { AuthConfig } from "../config/env";

const projectOverviewResponseSchema = z.object({
  id: z.string().describe("Identificador (UUID) do projeto."),
  userId: z
    .string()
    .describe("Identificador (UUID) do usuário dono do projeto."),
  name: z.string().describe("Nome do projeto."),
  description: z
    .string()
    .nullable()
    .describe("Descrição do projeto, ou null quando não informada."),
  createdAt: z.date().describe("Data/hora de criação do projeto."),
  updatedAt: z.date().describe("Data/hora da última atualização do projeto."),
  librariesCount: z
    .number()
    .int()
    .describe("Quantidade de bibliotecas associadas a esse projeto."),
  libraryNames: z
    .array(z.string())
    .describe(
      "Nomes das bibliotecas associadas a esse projeto, em nenhuma ordem garantida. Array vazio quando o projeto não tem nenhuma.",
    ),
});

export type ProjectsOverviewRouteOptions = {
  projectsOverviewRepository?: ProjectsOverviewRepository;
  authConfig?: AuthConfig;
};

export const projectsOverviewRoute: FastifyPluginAsyncZod<
  ProjectsOverviewRouteOptions
> = async (app, opts) => {
  let projectsOverviewRepository = opts.projectsOverviewRepository;

  function getProjectsOverviewRepository(): ProjectsOverviewRepository {
    if (!projectsOverviewRepository) {
      projectsOverviewRepository = createProjectsRepository(
        createDb(getDatabaseUrl()),
      );
    }
    return projectsOverviewRepository;
  }

  app.get(
    "/projects/overview",
    {
      preHandler: createAuthenticateMiddleware(opts.authConfig),
      schema: {
        tags: ["Projects"],
        summary:
          "Lista os projetos do usuário autenticado com contagem de bibliotecas",
        description:
          "Retorna todos os projetos do usuário autenticado (o `userId` vem do token de acesso), cada um com librariesCount — a quantidade de bibliotecas associadas a esse projeto. Ordenado por data de criação, mais recente primeiro. Sem paginação — lista completa em uma única resposta.",
        security: [{ bearerAuth: [] }],
        response: {
          200: z
            .array(projectOverviewResponseSchema)
            .describe(
              "Lista de projetos do usuário, mais recente primeiro. Array vazio quando o usuário ainda não tem projetos.",
            ),
        },
      },
    },
    async (request, reply) => {
      const items = await listProjectsOverview(
        getProjectsOverviewRepository(),
        request.user.id,
      );
      return reply.status(200).send(items);
    },
  );
};
