import { describe, it, expect, vi } from "vitest";
import { createProjectsRepository, type DbClient } from "./projects.repository";

function fakeDbForSelect(rows: unknown[]) {
  const where = vi.fn().mockResolvedValue(rows);
  const from = vi.fn().mockReturnValue({ where });
  const select = vi.fn().mockReturnValue({ from });

  return { db: { select } as unknown as DbClient, select, from, where };
}

function fakeDbForSelectWithLimit(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  const select = vi.fn().mockReturnValue({ from });

  return { db: { select } as unknown as DbClient, select, from, where, limit };
}

function fakeDbForInsert(row: unknown) {
  const returning = vi.fn().mockResolvedValue([row]);
  const values = vi.fn().mockReturnValue({ returning });
  const insert = vi.fn().mockReturnValue({ values });

  return { db: { insert } as unknown as DbClient, insert, values, returning };
}

function fakeDbForUpdate(rows: unknown[]) {
  const returning = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockReturnValue({ where });
  const update = vi.fn().mockReturnValue({ set });

  return {
    db: { update } as unknown as DbClient,
    update,
    set,
    where,
    returning,
  };
}

function fakeDbForDelete() {
  const where = vi.fn().mockResolvedValue(undefined);
  const del = vi.fn().mockReturnValue({ where });

  return { db: { delete: del } as unknown as DbClient, delete: del, where };
}

const project = {
  id: "project-1",
  userId: "user-1",
  name: "DevLib",
  description: "Catálogo pessoal",
  createdAt: new Date("2026-09-01T00:00:00Z"),
  updatedAt: new Date("2026-09-01T00:00:00Z"),
};

describe("createProjectsRepository", () => {
  describe("insertProject", () => {
    it("insere e retorna o projeto criado, com description nula quando omitida", async () => {
      const { db, values } = fakeDbForInsert(project);

      const repository = createProjectsRepository(db);
      const result = await repository.insertProject({
        userId: "user-1",
        name: "DevLib",
      });

      expect(result).toEqual(project);
      expect(values).toHaveBeenCalledWith({
        userId: "user-1",
        name: "DevLib",
        description: null,
      });
    });

    it("insere com a description informada", async () => {
      const { db, values } = fakeDbForInsert(project);

      const repository = createProjectsRepository(db);
      await repository.insertProject({
        userId: "user-1",
        name: "DevLib",
        description: "Catálogo pessoal",
      });

      expect(values).toHaveBeenCalledWith({
        userId: "user-1",
        name: "DevLib",
        description: "Catálogo pessoal",
      });
    });
  });

  describe("findProjectsByUserId", () => {
    it("retorna os projetos do usuário", async () => {
      const { db, select } = fakeDbForSelect([project]);

      const repository = createProjectsRepository(db);
      const result = await repository.findProjectsByUserId("user-1");

      expect(result).toEqual([project]);
      expect(select).toHaveBeenCalledOnce();
    });

    it("retorna array vazio quando o usuário não tem projetos", async () => {
      const { db } = fakeDbForSelect([]);

      const repository = createProjectsRepository(db);
      const result = await repository.findProjectsByUserId("user-1");

      expect(result).toEqual([]);
    });
  });

  describe("findProjectById", () => {
    it("retorna o projeto quando o id existe", async () => {
      const { db } = fakeDbForSelectWithLimit([project]);

      const repository = createProjectsRepository(db);
      const result = await repository.findProjectById("project-1");

      expect(result).toEqual(project);
    });

    it("retorna undefined quando o id não existe", async () => {
      const { db } = fakeDbForSelectWithLimit([]);

      const repository = createProjectsRepository(db);
      const result = await repository.findProjectById("project-inexistente");

      expect(result).toBeUndefined();
    });
  });

  describe("findProjectByUserIdAndName", () => {
    it("retorna o projeto quando o usuário já tem um com esse nome", async () => {
      const { db } = fakeDbForSelectWithLimit([project]);

      const repository = createProjectsRepository(db);
      const result = await repository.findProjectByUserIdAndName(
        "user-1",
        "DevLib",
      );

      expect(result).toEqual(project);
    });

    it("retorna undefined quando não há projeto com esse nome pro usuário", async () => {
      const { db } = fakeDbForSelectWithLimit([]);

      const repository = createProjectsRepository(db);
      const result = await repository.findProjectByUserIdAndName(
        "user-1",
        "Inexistente",
      );

      expect(result).toBeUndefined();
    });
  });

  describe("updateProject", () => {
    it("atualiza os campos informados e retorna o projeto atualizado", async () => {
      const updated = { ...project, name: "DevLib v2" };
      const { db, set, where } = fakeDbForUpdate([updated]);

      const repository = createProjectsRepository(db);
      const result = await repository.updateProject("project-1", {
        name: "DevLib v2",
      });

      expect(result).toEqual(updated);
      expect(set).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "DevLib v2",
          updatedAt: expect.any(Date),
        }),
      );
      expect(where).toHaveBeenCalledOnce();
    });

    it("retorna undefined quando o id não existe", async () => {
      const { db } = fakeDbForUpdate([]);

      const repository = createProjectsRepository(db);
      const result = await repository.updateProject("project-inexistente", {
        name: "DevLib v2",
      });

      expect(result).toBeUndefined();
    });
  });

  describe("deleteProject", () => {
    it("exclui o projeto pelo id", async () => {
      const { db, delete: del, where } = fakeDbForDelete();

      const repository = createProjectsRepository(db);
      await repository.deleteProject("project-1");

      expect(del).toHaveBeenCalledOnce();
      expect(where).toHaveBeenCalledOnce();
    });
  });
});
