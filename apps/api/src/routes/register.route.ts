import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { createDb, getDatabaseUrl } from "@devlib/db";
import { registerUser, EmailAlreadyInUseError } from "../services/auth.service";
import {
  createUsersRepository,
  type UsersRepository,
} from "../repositories/users.repository";

const registerBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const registerResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  createdAt: z.date(),
});

const errorResponseSchema = z.object({ error: z.string() });

export type RegisterRouteOptions = {
  usersRepository?: UsersRepository;
};

export const registerRoute: FastifyPluginAsyncZod<
  RegisterRouteOptions
> = async (app, opts) => {
  let usersRepository = opts.usersRepository;

  function getUsersRepository(): UsersRepository {
    if (!usersRepository) {
      usersRepository = createUsersRepository(createDb(getDatabaseUrl()));
    }
    return usersRepository;
  }

  app.post(
    "/auth/register",
    {
      schema: {
        body: registerBodySchema,
        response: { 201: registerResponseSchema, 409: errorResponseSchema },
      },
    },
    async (request, reply) => {
      try {
        const user = await registerUser(getUsersRepository(), request.body);
        return reply.status(201).send(user);
      } catch (error) {
        if (error instanceof EmailAlreadyInUseError) {
          return reply.status(409).send({ error: error.message });
        }
        throw error;
      }
    },
  );
};
