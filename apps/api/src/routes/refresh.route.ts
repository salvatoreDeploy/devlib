import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { createDb, getDatabaseUrl } from "@devlib/db";
import {
  refreshSession,
  InvalidRefreshTokenError,
  type RefreshRepository,
} from "../services/auth.service";
import { createRefreshTokensRepository } from "../repositories/refresh-tokens.repository";
import { getAuthConfig, type AuthConfig } from "../config/env";

const refreshBodySchema = z.object({
  refreshToken: z.string().min(1),
});

const refreshResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

const errorResponseSchema = z.object({ error: z.string() });

export type RefreshRouteOptions = {
  refreshRepository?: RefreshRepository;
  authConfig?: AuthConfig;
};

export const refreshRoute: FastifyPluginAsyncZod<RefreshRouteOptions> = async (
  app,
  opts,
) => {
  let refreshRepository = opts.refreshRepository;
  let authConfig = opts.authConfig;

  function getRefreshRepository(): RefreshRepository {
    if (!refreshRepository) {
      refreshRepository = createRefreshTokensRepository(
        createDb(getDatabaseUrl()),
      );
    }
    return refreshRepository;
  }

  function getConfig(): AuthConfig {
    if (!authConfig) {
      authConfig = getAuthConfig();
    }
    return authConfig;
  }

  app.post(
    "/auth/refresh",
    {
      schema: {
        body: refreshBodySchema,
        response: { 200: refreshResponseSchema, 401: errorResponseSchema },
      },
    },
    async (request, reply) => {
      try {
        const tokens = await refreshSession(
          getRefreshRepository(),
          getConfig(),
          request.body,
        );
        return reply.status(200).send(tokens);
      } catch (error) {
        if (error instanceof InvalidRefreshTokenError) {
          return reply.status(401).send({ error: error.message });
        }
        throw error;
      }
    },
  );
};
