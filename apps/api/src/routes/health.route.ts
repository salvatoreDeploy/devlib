import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

export const healthRoute: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/health",
    {
      schema: {
        response: {
          200: z.object({ status: z.literal("ok") }),
        },
      },
    },
    async () => {
      return { status: "ok" as const };
    },
  );
};
