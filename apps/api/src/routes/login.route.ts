import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { createDb, getDatabaseUrl } from "@devlib/db";
import {
  loginUser,
  InvalidCredentialsError,
  type LoginRepository,
} from "../services/auth.service";
import { createUsersRepository } from "../repositories/users.repository";
import { createRefreshTokensRepository } from "../repositories/refresh-tokens.repository";
import { getAuthConfig, type AuthConfig } from "../config/env";

const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const loginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

const errorResponseSchema = z.object({ error: z.string() });

export type LoginRouteOptions = {
  loginRepository?: LoginRepository;
  authConfig?: AuthConfig;
};

export const loginRoute: FastifyPluginAsyncZod<LoginRouteOptions> = async (
  app,
  opts,
) => {
  let loginRepository = opts.loginRepository;
  let authConfig = opts.authConfig;

  function getLoginRepository(): LoginRepository {
    if (!loginRepository) {
      const db = createDb(getDatabaseUrl());
      loginRepository = {
        ...createUsersRepository(db),
        ...createRefreshTokensRepository(db),
      };
    }
    return loginRepository;
  }

  function getConfig(): AuthConfig {
    if (!authConfig) {
      authConfig = getAuthConfig();
    }
    return authConfig;
  }

  app.post(
    "/auth/login",
    {
      schema: {
        body: loginBodySchema,
        response: { 200: loginResponseSchema, 401: errorResponseSchema },
      },
    },
    async (request, reply) => {
      try {
        const tokens = await loginUser(
          getLoginRepository(),
          getConfig(),
          request.body,
        );
        return reply.status(200).send(tokens);
      } catch (error) {
        if (error instanceof InvalidCredentialsError) {
          return reply.status(401).send({ error: error.message });
        }
        throw error;
      }
    },
  );
};
