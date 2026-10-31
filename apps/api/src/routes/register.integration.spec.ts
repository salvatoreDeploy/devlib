import { describe, expect, it } from "vitest";
import { users } from "@devlib/db";
import { buildServer } from "../server";
import { createUsersRepository } from "../repositories/users.repository";
import { getTestDb } from "../../test/integration/test-db";

const PASSWORD = "senha-forte-123";

function register(app: ReturnType<typeof buildServer>, email: string) {
  return app.inject({
    method: "POST",
    url: "/auth/register",
    payload: { email, password: PASSWORD },
  });
}

describe("POST /auth/register (Postgres real)", () => {
  it("corrida com o mesmo e-mail (os dois passam pela checagem do service) retorna 409 via 23505, não 500", async () => {
    const db = getTestDb();
    // a checagem prévia nunca encontra o e-mail, então o segundo insert bate
    // no unique real de users.email
    const app = buildServer({
      usersRepository: {
        ...createUsersRepository(db),
        findUserByEmail: async () => undefined,
      },
    });

    const first = await register(app, "ana@example.com");
    const second = await register(app, "ana@example.com");

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(409);
    expect(await db.select().from(users)).toHaveLength(1);
  });
});
