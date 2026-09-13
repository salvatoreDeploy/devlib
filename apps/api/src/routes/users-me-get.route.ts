import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { createDb, getDatabaseUrl } from "@devlib/db";
import {
  getCurrentUser,
  UserNotFoundError,
  type UsersRepository,
} from "../services/users.service";
import { createUsersRepository } from "../repositories/users.repository";
import { createAuthenticateMiddleware } from "../middleware/authenticate";
import type { AuthConfig } from "../config/env";

const userResponseSchema = z.object({
  id: z.string().describe("Identificador (UUID) do usuário."),
  email: z.string().describe("E-mail do usuário."),
  name: z
    .string()
    .nullable()
    .describe("Nome de exibição, ou null quando não informado."),
  avatarUrl: z
    .string()
    .nullable()
    .describe("URL da foto de perfil, ou null quando não informada."),
  createdAt: z.date().describe("Data/hora de criação da conta."),
  updatedAt: z.date().describe("Data/hora da última atualização do perfil."),
});

const errorResponseSchema = z.object({
  error: z.string().describe("Mensagem de erro legível."),
});

export type UsersMeGetRouteOptions = {
  usersRepository?: UsersRepository;
  authConfig?: AuthConfig;
};

export const usersMeGetRoute: FastifyPluginAsyncZod<
  UsersMeGetRouteOptions
> = async (app, opts) => {
  let usersRepository = opts.usersRepository;

  function getUsersRepository(): UsersRepository {
    if (!usersRepository) {
      usersRepository = createUsersRepository(createDb(getDatabaseUrl()));
    }
    return usersRepository;
  }

  app.get(
    "/users/me",
    {
      preHandler: createAuthenticateMiddleware(opts.authConfig),
      schema: {
        tags: ["Users"],
        summary: "Perfil do usuário autenticado",
        description:
          "Retorna os dados do usuário dono do token de acesso enviado.",
        security: [{ bearerAuth: [] }],
        response: {
          200: userResponseSchema.describe("Perfil do usuário."),
          404: errorResponseSchema.describe(
            "Usuário do token não existe mais.",
          ),
        },
      },
    },
    async (request, reply) => {
      try {
        const user = await getCurrentUser(
          getUsersRepository(),
          request.user.id,
        );
        return reply.status(200).send(user);
      } catch (error) {
        if (error instanceof UserNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        throw error;
      }
    },
  );
};
