import type { FastifyInstance } from "fastify";
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

export type LoginRouteOptions = {
  loginRepository?: LoginRepository;
  authConfig?: AuthConfig;
};

export async function loginRoute(
  app: FastifyInstance,
  opts: LoginRouteOptions,
) {
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

  app.post("/auth/login", async (request, reply) => {
    const parsed = loginBodySchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message });
    }

    try {
      const tokens = await loginUser(
        getLoginRepository(),
        getConfig(),
        parsed.data,
      );
      return reply.status(200).send(tokens);
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        return reply.status(401).send({ error: error.message });
      }
      throw error;
    }
  });
}
