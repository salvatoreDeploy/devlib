import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { createDb, getDatabaseUrl } from "@devlib/db";
import {
  listProjects,
  type ProjectsRepository,
} from "../services/projects.service";
import { createProjectsRepository } from "../repositories/projects.repository";
import { createAuthenticateMiddleware } from "../middleware/authenticate";
import type { AuthConfig } from "../config/env";

const projectResponseSchema = z.object({
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
});

export type ProjectsListRouteOptions = {
  projectsRepository?: ProjectsRepository;
  authConfig?: AuthConfig;
};

export const projectsListRoute: FastifyPluginAsyncZod<
  ProjectsListRouteOptions
> = async (app, opts) => {
  let projectsRepository = opts.projectsRepository;

  function getProjectsRepository(): ProjectsRepository {
    if (!projectsRepository) {
      projectsRepository = createProjectsRepository(createDb(getDatabaseUrl()));
    }
    return projectsRepository;
  }

  app.get(
    "/projects",
    {
      preHandler: createAuthenticateMiddleware(opts.authConfig),
      schema: {
        tags: ["Projects"],
        summary: "Lista os projetos do usuário autenticado",
        description:
          "Retorna todos os projetos que pertencem ao usuário autenticado (o `userId` vem do token de acesso). Nunca retorna projetos de outros usuários. Sem paginação — lista completa em uma única resposta.",
        security: [{ bearerAuth: [] }],
        response: {
          200: z
            .array(projectResponseSchema)
            .describe(
              "Lista de projetos do usuário, em nenhuma ordem garantida. Array vazio quando o usuário ainda não tem projetos.",
            ),
        },
      },
    },
    async (request, reply) => {
      const items = await listProjects(
        getProjectsRepository(),
        request.user.id,
      );
      return reply.status(200).send(items);
    },
  );
};
