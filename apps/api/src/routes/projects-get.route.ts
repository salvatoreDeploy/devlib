import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { createDb, getDatabaseUrl } from "@devlib/db";
import {
  getProject,
  ProjectNotFoundError,
  type ProjectsRepository,
} from "../services/projects.service";
import { createProjectsRepository } from "../repositories/projects.repository";
import { createAuthenticateMiddleware } from "../middleware/authenticate";
import type { AuthConfig } from "../config/env";

const projectParamsSchema = z.object({
  id: z.string().min(1).describe("Identificador (UUID) do projeto."),
});

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

const errorResponseSchema = z.object({
  error: z.string().describe("Mensagem de erro legível."),
});

export type ProjectsGetRouteOptions = {
  projectsRepository?: ProjectsRepository;
  authConfig?: AuthConfig;
};

export const projectsGetRoute: FastifyPluginAsyncZod<
  ProjectsGetRouteOptions
> = async (app, opts) => {
  let projectsRepository = opts.projectsRepository;

  function getProjectsRepository(): ProjectsRepository {
    if (!projectsRepository) {
      projectsRepository = createProjectsRepository(createDb(getDatabaseUrl()));
    }
    return projectsRepository;
  }

  app.get(
    "/projects/:id",
    {
      preHandler: createAuthenticateMiddleware(opts.authConfig),
      schema: {
        tags: ["Projects"],
        summary: "Detalha um projeto",
        description:
          "Retorna um projeto pelo id, desde que pertença ao usuário autenticado. Se o id não existir OU existir mas pertencer a outro usuário, responde 404 nos dois casos, sem diferenciar — evita confirmar pra quem não é dono que aquele id existe.",
        security: [{ bearerAuth: [] }],
        params: projectParamsSchema,
        response: {
          200: projectResponseSchema.describe("Projeto encontrado."),
          404: errorResponseSchema.describe(
            "Projeto não encontrado, ou encontrado mas de outro usuário.",
          ),
        },
      },
    },
    async (request, reply) => {
      try {
        const project = await getProject(getProjectsRepository(), {
          userId: request.user.id,
          projectId: request.params.id,
        });
        return reply.status(200).send(project);
      } catch (error) {
        if (error instanceof ProjectNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        throw error;
      }
    },
  );
};
