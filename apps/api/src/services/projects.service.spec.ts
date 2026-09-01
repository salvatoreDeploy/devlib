import { describe, it, expect, vi } from "vitest";
import {
  createProject,
  listProjects,
  getProject,
  updateProject,
  deleteProject,
  ProjectNotFoundError,
  ProjectNameAlreadyExistsError,
  type ProjectsRepository,
} from "./projects.service";

const project = {
  id: "project-1",
  userId: "user-1",
  name: "DevLib",
  description: "Catálogo pessoal",
  createdAt: new Date("2026-09-01T00:00:00Z"),
  updatedAt: new Date("2026-09-01T00:00:00Z"),
};

function fakeRepository(
  overrides: Partial<ProjectsRepository> = {},
): ProjectsRepository {
  return {
    insertProject: vi.fn().mockResolvedValue(project),
    findProjectsByUserId: vi.fn().mockResolvedValue([project]),
    findProjectById: vi.fn().mockResolvedValue(project),
    findProjectByUserIdAndName: vi.fn().mockResolvedValue(undefined),
    updateProject: vi.fn().mockResolvedValue(project),
    deleteProject: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("createProject", () => {
  it("cria o projeto quando o usuário não tem outro com o mesmo nome", async () => {
    const repository = fakeRepository();

    const result = await createProject(repository, {
      userId: "user-1",
      name: "DevLib",
      description: "Catálogo pessoal",
    });

    expect(result).toEqual(project);
    expect(repository.insertProject).toHaveBeenCalledWith({
      userId: "user-1",
      name: "DevLib",
      description: "Catálogo pessoal",
    });
  });

  it("lança ProjectNameAlreadyExistsError quando o usuário já tem um projeto com esse nome", async () => {
    const repository = fakeRepository({
      findProjectByUserIdAndName: vi.fn().mockResolvedValue(project),
    });

    await expect(
      createProject(repository, { userId: "user-1", name: "DevLib" }),
    ).rejects.toThrow(ProjectNameAlreadyExistsError);
    expect(repository.insertProject).not.toHaveBeenCalled();
  });
});

describe("listProjects", () => {
  it("retorna os projetos do usuário", async () => {
    const repository = fakeRepository();

    const result = await listProjects(repository, "user-1");

    expect(result).toEqual([project]);
    expect(repository.findProjectsByUserId).toHaveBeenCalledWith("user-1");
  });
});

describe("getProject", () => {
  it("retorna o projeto quando pertence ao usuário", async () => {
    const repository = fakeRepository();

    const result = await getProject(repository, {
      userId: "user-1",
      projectId: "project-1",
    });

    expect(result).toEqual(project);
  });

  it("lança ProjectNotFoundError quando o projeto não existe", async () => {
    const repository = fakeRepository({
      findProjectById: vi.fn().mockResolvedValue(undefined),
    });

    await expect(
      getProject(repository, { userId: "user-1", projectId: "project-x" }),
    ).rejects.toThrow(ProjectNotFoundError);
  });

  it("lança ProjectNotFoundError quando o projeto é de outro usuário", async () => {
    const repository = fakeRepository({
      findProjectById: vi
        .fn()
        .mockResolvedValue({ ...project, userId: "outro-usuario" }),
    });

    await expect(
      getProject(repository, { userId: "user-1", projectId: "project-1" }),
    ).rejects.toThrow(ProjectNotFoundError);
  });
});

describe("updateProject", () => {
  it("atualiza o projeto quando pertence ao usuário e o nome não colide", async () => {
    const updated = { ...project, name: "DevLib v2" };
    const repository = fakeRepository({
      updateProject: vi.fn().mockResolvedValue(updated),
    });

    const result = await updateProject(repository, {
      userId: "user-1",
      projectId: "project-1",
      data: { name: "DevLib v2" },
    });

    expect(result).toEqual(updated);
    expect(repository.updateProject).toHaveBeenCalledWith("project-1", {
      name: "DevLib v2",
    });
  });

  it("lança ProjectNotFoundError quando o projeto não é do usuário", async () => {
    const repository = fakeRepository({
      findProjectById: vi
        .fn()
        .mockResolvedValue({ ...project, userId: "outro-usuario" }),
    });

    await expect(
      updateProject(repository, {
        userId: "user-1",
        projectId: "project-1",
        data: { name: "DevLib v2" },
      }),
    ).rejects.toThrow(ProjectNotFoundError);
    expect(repository.updateProject).not.toHaveBeenCalled();
  });

  it("lança ProjectNameAlreadyExistsError quando o novo nome já é usado por outro projeto do usuário", async () => {
    const outroProjeto = { ...project, id: "project-2", name: "Outro" };
    const repository = fakeRepository({
      findProjectByUserIdAndName: vi.fn().mockResolvedValue(outroProjeto),
    });

    await expect(
      updateProject(repository, {
        userId: "user-1",
        projectId: "project-1",
        data: { name: "Outro" },
      }),
    ).rejects.toThrow(ProjectNameAlreadyExistsError);
    expect(repository.updateProject).not.toHaveBeenCalled();
  });

  it("não lança ProjectNameAlreadyExistsError quando o nome colide com o próprio projeto (sem mudança real)", async () => {
    const repository = fakeRepository({
      findProjectByUserIdAndName: vi.fn().mockResolvedValue(project),
    });

    await updateProject(repository, {
      userId: "user-1",
      projectId: "project-1",
      data: { name: "DevLib" },
    });

    expect(repository.updateProject).toHaveBeenCalledWith("project-1", {
      name: "DevLib",
    });
  });
});

describe("deleteProject", () => {
  it("exclui o projeto quando pertence ao usuário", async () => {
    const repository = fakeRepository();

    await deleteProject(repository, {
      userId: "user-1",
      projectId: "project-1",
    });

    expect(repository.deleteProject).toHaveBeenCalledWith("project-1");
  });

  it("lança ProjectNotFoundError quando o projeto não é do usuário, sem excluir", async () => {
    const repository = fakeRepository({
      findProjectById: vi
        .fn()
        .mockResolvedValue({ ...project, userId: "outro-usuario" }),
    });

    await expect(
      deleteProject(repository, {
        userId: "user-1",
        projectId: "project-1",
      }),
    ).rejects.toThrow(ProjectNotFoundError);
    expect(repository.deleteProject).not.toHaveBeenCalled();
  });
});
