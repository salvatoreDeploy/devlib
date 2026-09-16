import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { createDb, getDatabaseUrl } from "@devlib/db";
import { logoutUser, type RefreshRepository } from "../services/auth.service";
import { createRefreshTokensRepository } from "../repositories/refresh-tokens.repository";

const logoutBodySchema = z.object({
  refreshToken: z
    .string()
    .min(1)
    .describe("Refresh token da sessão a ser encerrada."),
});

export type LogoutRouteOptions = {
  refreshRepository?: RefreshRepository;
};

export const logoutRoute: FastifyPluginAsyncZod<LogoutRouteOptions> = async (
  app,
  opts,
) => {
  let refreshRepository = opts.refreshRepository;

  function getRefreshRepository(): RefreshRepository {
    if (!refreshRepository) {
      refreshRepository = createRefreshTokensRepository(
        createDb(getDatabaseUrl()),
      );
    }
    return refreshRepository;
  }

  app.post(
    "/auth/logout",
    {
      schema: {
        tags: ["Auth"],
        summary: "Encerra a sessão (revoga o refresh token)",
        description:
          "Revoga o refresh token informado, se ele existir e ainda não tiver sido revogado. Idempotente: token inexistente, inválido ou já revogado também responde 204 — o objetivo (não estar mais logado com esse token) já está satisfeito. O access token em si não é revogado (é stateless) e continua válido até expirar naturalmente.",
        body: logoutBodySchema,
        response: {
          204: z.null().describe("Sessão encerrada (ou já não existia)."),
        },
      },
    },
    async (request, reply) => {
      await logoutUser(getRefreshRepository(), request.body);
      return reply.status(204).send(null);
    },
  );
};
