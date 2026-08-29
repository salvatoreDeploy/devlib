import type { FastifyInstance } from "fastify";
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

export type RegisterRouteOptions = {
  usersRepository?: UsersRepository;
};

export async function registerRoute(
  app: FastifyInstance,
  opts: RegisterRouteOptions,
) {
  let usersRepository = opts.usersRepository;

  function getUsersRepository(): UsersRepository {
    if (!usersRepository) {
      usersRepository = createUsersRepository(createDb(getDatabaseUrl()));
    }
    return usersRepository;
  }

  app.post("/auth/register", async (request, reply) => {
    const parsed = registerBodySchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message });
    }

    try {
      const user = await registerUser(getUsersRepository(), parsed.data);
      return reply.status(201).send(user);
    } catch (error) {
      if (error instanceof EmailAlreadyInUseError) {
        return reply.status(409).send({ error: error.message });
      }
      throw error;
    }
  });
}
