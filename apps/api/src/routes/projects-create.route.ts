import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { createDb, getDatabaseUrl } from "@devlib/db";
import {
  createProject,
  ProjectNameAlreadyExistsError,
  type ProjectsRepository,
} from "../services/projects.service";
import { createProjectsRepository } from "../repositories/projects.repository";
import { createAuthenticateMiddleware } from "../middleware/authenticate";
import type { AuthConfig } from "../config/env";

const createProjectBodySchema = z.object({
  name: z
    .string()
    .min(1)
    .describe(
      "Nome do projeto. Deve ser único entre os projetos do usuário autenticado (não precisa ser único globalmente).",
    ),
  description: z
    .string()
    .min(1)
    .optional()
    .describe("Descrição livre do projeto. Opcional."),
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

export type ProjectsCreateRouteOptions = {
  projectsRepository?: ProjectsRepository;
  authConfig?: AuthConfig;
};

export const projectsCreateRoute: FastifyPluginAsyncZod<
  ProjectsCreateRouteOptions
> = async (app, opts) => {
  let projectsRepository = opts.projectsRepository;

  function getProjectsRepository(): ProjectsRepository {
    if (!projectsRepository) {
      projectsRepository = createProjectsRepository(createDb(getDatabaseUrl()));
    }
    return projectsRepository;
  }

  app.post(
    "/projects",
    {
      preHandler: createAuthenticateMiddleware(opts.authConfig),
      schema: {
        tags: ["Projects"],
        summary: "Cria um projeto",
        description:
          "Cria um projeto para o usuário autenticado (o `userId` vem do token de acesso, nunca do corpo da requisição). Retorna 409 se o usuário já tiver outro projeto com o mesmo nome.",
        security: [{ bearerAuth: [] }],
        body: createProjectBodySchema,
        response: {
          201: projectResponseSchema.describe("Projeto criado com sucesso."),
          409: errorResponseSchema.describe(
            "O usuário autenticado já tem um projeto com esse nome.",
          ),
        },
      },
    },
    async (request, reply) => {
      try {
        const project = await createProject(getProjectsRepository(), {
          userId: request.user.id,
          ...request.body,
        });
        return reply.status(201).send(project);
      } catch (error) {
        if (error instanceof ProjectNameAlreadyExistsError) {
          return reply.status(409).send({ error: error.message });
        }
        throw error;
      }
    },
  );
};
