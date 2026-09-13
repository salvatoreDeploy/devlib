import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { createDb, getDatabaseUrl } from "@devlib/db";
import {
  updateCurrentUser,
  UserNotFoundError,
  InvalidCurrentPasswordError,
  EmailAlreadyInUseError,
  type UpdateUserRepository,
} from "../services/users.service";
import { createUsersRepository } from "../repositories/users.repository";
import { createRefreshTokensRepository } from "../repositories/refresh-tokens.repository";
import { createAuthenticateMiddleware } from "../middleware/authenticate";
import type { AuthConfig } from "../config/env";

const updateUserBodySchema = z
  .object({
    name: z
      .string()
      .min(1)
      .optional()
      .describe("Novo nome de exibição. Opcional (omitir mantém o atual)."),
    email: z
      .string()
      .email()
      .optional()
      .describe("Novo e-mail. Opcional; exige currentPassword no mesmo corpo."),
    password: z
      .string()
      .min(8)
      .optional()
      .describe(
        "Nova senha (mínimo 8 caracteres). Opcional; exige currentPassword no mesmo corpo.",
      ),
    currentPassword: z
      .string()
      .optional()
      .describe(
        "Senha atual do usuário. Obrigatória quando email ou password forem informados.",
      ),
  })
  .refine((data) => !(data.email || data.password) || !!data.currentPassword, {
    message: "currentPassword é obrigatório para trocar e-mail ou senha",
    path: ["currentPassword"],
  });

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

export type UsersMeUpdateRouteOptions = {
  usersUpdateRepository?: UpdateUserRepository;
  authConfig?: AuthConfig;
};

export const usersMeUpdateRoute: FastifyPluginAsyncZod<
  UsersMeUpdateRouteOptions
> = async (app, opts) => {
  let usersUpdateRepository = opts.usersUpdateRepository;

  function getUsersRepository(): UpdateUserRepository {
    if (!usersUpdateRepository) {
      const db = createDb(getDatabaseUrl());
      usersUpdateRepository = {
        ...createUsersRepository(db),
        ...createRefreshTokensRepository(db),
      };
    }
    return usersUpdateRepository;
  }

  app.patch(
    "/users/me",
    {
      preHandler: createAuthenticateMiddleware(opts.authConfig),
      schema: {
        tags: ["Users"],
        summary: "Atualiza o perfil do usuário autenticado",
        description:
          "Atualiza nome, e-mail e/ou senha. Campos omitidos não são alterados. Trocar e-mail ou senha exige currentPassword no corpo. Trocar a senha revoga todos os refresh tokens ativos do usuário (força novo login nas outras sessões).",
        security: [{ bearerAuth: [] }],
        body: updateUserBodySchema,
        response: {
          200: userResponseSchema.describe("Perfil atualizado."),
          401: errorResponseSchema.describe("currentPassword incorreta."),
          404: errorResponseSchema.describe(
            "Usuário do token não existe mais.",
          ),
          409: errorResponseSchema.describe(
            "O novo e-mail já está em uso por outro usuário.",
          ),
        },
      },
    },
    async (request, reply) => {
      try {
        const user = await updateCurrentUser(getUsersRepository(), {
          userId: request.user.id,
          data: request.body,
        });
        return reply.status(200).send(user);
      } catch (error) {
        if (error instanceof UserNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        if (error instanceof InvalidCurrentPasswordError) {
          return reply.status(401).send({ error: error.message });
        }
        if (error instanceof EmailAlreadyInUseError) {
          return reply.status(409).send({ error: error.message });
        }
        throw error;
      }
    },
  );
};
