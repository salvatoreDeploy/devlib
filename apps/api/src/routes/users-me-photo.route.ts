import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { createDb, getDatabaseUrl } from "@devlib/db";
import {
  updateCurrentUserAvatar,
  UserNotFoundError,
  type UsersRepository,
  type AvatarStorage,
} from "../services/users.service";
import { InvalidFileTypeError } from "../services/avatar-storage.service";
import { createUsersRepository } from "../repositories/users.repository";
import { createAvatarStorage } from "../services/avatar-storage.service";
import { createAuthenticateMiddleware } from "../middleware/authenticate";
import type { AuthConfig } from "../config/env";

export class NoFileProvidedError extends Error {
  constructor() {
    super("Nenhum arquivo enviado");
    this.name = "NoFileProvidedError";
  }
}

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

export type UsersMePhotoRouteOptions = {
  usersRepository?: UsersRepository;
  avatarStorage?: AvatarStorage;
  authConfig?: AuthConfig;
};

export const usersMePhotoRoute: FastifyPluginAsyncZod<
  UsersMePhotoRouteOptions
> = async (app, opts) => {
  let usersRepository = opts.usersRepository;
  let avatarStorage = opts.avatarStorage;

  function getUsersRepository(): UsersRepository {
    if (!usersRepository) {
      usersRepository = createUsersRepository(createDb(getDatabaseUrl()));
    }
    return usersRepository;
  }

  function getAvatarStorage(): AvatarStorage {
    if (!avatarStorage) {
      avatarStorage = createAvatarStorage();
    }
    return avatarStorage;
  }

  app.post(
    "/users/me/photo",
    {
      preHandler: createAuthenticateMiddleware(opts.authConfig),
      schema: {
        tags: ["Users"],
        summary: "Atualiza a foto de perfil do usuário autenticado",
        description:
          "Recebe multipart/form-data com um arquivo no campo 'photo' (image/png, image/jpeg ou image/webp; máximo 2MB) e o define como avatarUrl do usuário. Substitui e apaga a foto anterior, se houver.",
        security: [{ bearerAuth: [] }],
        consumes: ["multipart/form-data"],
        response: {
          200: userResponseSchema.describe("Perfil com a foto atualizada."),
          400: errorResponseSchema.describe(
            "Nenhum arquivo enviado, ou tipo de arquivo não suportado.",
          ),
          404: errorResponseSchema.describe(
            "Usuário do token não existe mais.",
          ),
          413: errorResponseSchema.describe(
            "Arquivo maior que o limite permitido (2MB).",
          ),
        },
      },
    },
    async (request, reply) => {
      try {
        const data = await request.file();

        if (!data) {
          throw new NoFileProvidedError();
        }

        const buffer = await data.toBuffer();

        const updated = await updateCurrentUserAvatar(
          getUsersRepository(),
          getAvatarStorage(),
          { userId: request.user.id, buffer, mimetype: data.mimetype },
        );

        return reply.status(200).send(updated);
      } catch (error) {
        if (error instanceof UserNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        if (
          error instanceof NoFileProvidedError ||
          error instanceof InvalidFileTypeError
        ) {
          return reply.status(400).send({ error: error.message });
        }
        throw error;
      }
    },
  );
};
