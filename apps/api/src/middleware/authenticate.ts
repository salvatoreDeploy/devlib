import type { FastifyReply, FastifyRequest } from "fastify";
import { getAuthConfig, type AuthConfig } from "../config/env";
import { verifyAccessToken } from "../services/token.service";

declare module "fastify" {
  interface FastifyRequest {
    user: { id: string; email: string };
  }
}

const BEARER_PREFIX = "Bearer ";

export function createAuthenticateMiddleware(authConfig?: AuthConfig) {
  let config = authConfig;

  function getConfig(): AuthConfig {
    if (!config) {
      config = getAuthConfig();
    }
    return config;
  }

  return async function authenticate(
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    const header = request.headers.authorization;

    if (!header?.startsWith(BEARER_PREFIX)) {
      return reply
        .status(401)
        .send({ error: "Token de acesso ausente ou mal formatado" });
    }

    const token = header.slice(BEARER_PREFIX.length);

    try {
      const payload = verifyAccessToken(token, getConfig().jwtSecret);
      request.user = { id: payload.sub, email: payload.email };
    } catch {
      return reply
        .status(401)
        .send({ error: "Token de acesso inválido ou expirado" });
    }
  };
}
