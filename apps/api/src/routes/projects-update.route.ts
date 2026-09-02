import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { createDb, getDatabaseUrl } from "@devlib/db";
import {
  updateProject,
  ProjectNotFoundError,
  ProjectNameAlreadyExistsError,
  type ProjectsRepository,
} from "../services/projects.service";
import { createProjectsRepository } from "../repositories/projects.repository";
import { createAuthenticateMiddleware } from "../middleware/authenticate";
import type { AuthConfig } from "../config/env";

const projectParamsSchema = z.object({
  id: z.string().min(1).describe("Identificador (UUID) do projeto."),
});

const updateProjectBodySchema = z.object({
  name: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Novo nome do projeto. Opcional (omitir mantém o atual). Deve continuar único entre os projetos do usuário.",
    ),
  description: z
    .string()
    .min(1)
    .optional()
    .describe("Nova descrição do projeto. Opcional (omitir mantém a atual)."),
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

export type ProjectsUpdateRouteOptions = {
  projectsRepository?: ProjectsRepository;
  authConfig?: AuthConfig;
};

export const projectsUpdateRoute: FastifyPluginAsyncZod<
  ProjectsUpdateRouteOptions
> = async (app, opts) => {
  let projectsRepository = opts.projectsRepository;

  function getProjectsRepository(): ProjectsRepository {
    if (!projectsRepository) {
      projectsRepository = createProjectsRepository(createDb(getDatabaseUrl()));
    }
    return projectsRepository;
  }

  app.patch(
    "/projects/:id",
    {
      preHandler: createAuthenticateMiddleware(opts.authConfig),
      schema: {
        tags: ["Projects"],
        summary: "Atualiza um projeto (parcial)",
        description:
          "Atualiza nome e/ou descrição de um projeto do usuário autenticado. Campos omitidos no corpo não são alterados. Responde 404 se o projeto não existir ou não pertencer ao usuário; responde 409 se o novo nome já for usado por outro projeto do mesmo usuário (renomear pro próprio nome atual não gera conflito).",
        security: [{ bearerAuth: [] }],
        params: projectParamsSchema,
        body: updateProjectBodySchema,
        response: {
          200: projectResponseSchema.describe("Projeto atualizado."),
          404: errorResponseSchema.describe(
            "Projeto não encontrado, ou encontrado mas de outro usuário.",
          ),
          409: errorResponseSchema.describe(
            "O novo nome já é usado por outro projeto do mesmo usuário.",
          ),
        },
      },
    },
    async (request, reply) => {
      try {
        const project = await updateProject(getProjectsRepository(), {
          userId: request.user.id,
          projectId: request.params.id,
          data: request.body,
        });
        return reply.status(200).send(project);
      } catch (error) {
        if (error instanceof ProjectNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        if (error instanceof ProjectNameAlreadyExistsError) {
          return reply.status(409).send({ error: error.message });
        }
        throw error;
      }
    },
  );
};
