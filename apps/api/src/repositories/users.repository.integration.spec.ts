import { describe, expect, it } from "vitest";
import { users } from "@devlib/db";
import { createUsersRepository } from "./users.repository";
import { getTestDb, pgErrorCode } from "../../test/integration/test-db";

const NON_EXISTENT_ID = "00000000-0000-0000-0000-000000000000";

describe("createUsersRepository (Postgres real)", () => {
  it("insertUser grava o usuário com name/avatarUrl nulos e findUserById/findUserByEmail o encontram", async () => {
    const repository = createUsersRepository(getTestDb());

    const inserted = await repository.insertUser({
      email: "ana@example.com",
      passwordHash: "hash-argon2",
    });

    expect(inserted).toMatchObject({
      email: "ana@example.com",
      passwordHash: "hash-argon2",
      name: null,
      avatarUrl: null,
    });
    expect(await repository.findUserById(inserted.id)).toEqual(inserted);
    expect(await repository.findUserByEmail("ana@example.com")).toEqual(
      inserted,
    );
  });

  it("findUserById/findUserByEmail retornam undefined quando não existe", async () => {
    const repository = createUsersRepository(getTestDb());

    expect(await repository.findUserById(NON_EXISTENT_ID)).toBeUndefined();
    expect(
      await repository.findUserByEmail("ninguem@example.com"),
    ).toBeUndefined();
  });

  it("insertUser com e-mail já cadastrado é bloqueado pela constraint unique (23505)", async () => {
    const repository = createUsersRepository(getTestDb());
    await repository.insertUser({
      email: "ana@example.com",
      passwordHash: "a",
    });

    const error = await repository
      .insertUser({ email: "ana@example.com", passwordHash: "b" })
      .catch((e: unknown) => e);

    expect(pgErrorCode(error)).toBe("23505");
    expect(await getTestDb().select().from(users)).toHaveLength(1);
  });

  it("updateUser grava name/avatarUrl e avança updatedAt", async () => {
    const repository = createUsersRepository(getTestDb());
    const inserted = await repository.insertUser({
      email: "ana@example.com",
      passwordHash: "hash",
    });

    const updated = await repository.updateUser(inserted.id, {
      name: "Ana",
      avatarUrl: "/uploads/avatars/ana.png",
    });

    expect(updated).toMatchObject({
      id: inserted.id,
      name: "Ana",
      avatarUrl: "/uploads/avatars/ana.png",
      email: "ana@example.com",
    });
    expect(updated!.updatedAt.getTime()).toBeGreaterThanOrEqual(
      inserted.updatedAt.getTime(),
    );
    expect(await repository.findUserById(inserted.id)).toEqual(updated);
  });

  it("updateUser retorna undefined quando o id não existe", async () => {
    const repository = createUsersRepository(getTestDb());

    expect(
      await repository.updateUser(NON_EXISTENT_ID, { name: "X" }),
    ).toBeUndefined();
  });
});
