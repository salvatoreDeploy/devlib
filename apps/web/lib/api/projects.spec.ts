import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createProject,
  CreateProjectError,
  deleteProject,
  DeleteProjectError,
  getProject,
  GetProjectError,
  listProjects,
  ListProjectsError,
  updateProject,
  UpdateProjectError,
} from "./projects";
import { authenticatedFetch } from "./http-client";

vi.mock("./http-client", () => ({ authenticatedFetch: vi.fn() }));

describe("createProject", () => {
  afterEach(() => {
    vi.mocked(authenticatedFetch).mockReset();
  });

  it("envia o body e o método corretos e retorna o projeto criado", async () => {
    const project = {
      id: "project-1",
      userId: "user-1",
      name: "DevLib",
      description: "Catálogo pessoal",
      createdAt: "2026-09-02T00:00:00.000Z",
      updatedAt: "2026-09-02T00:00:00.000Z",
    };
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(project),
    } as Response);

    const result = await createProject({
      name: "DevLib",
      description: "Catálogo pessoal",
    });

    expect(result).toEqual(project);
    expect(authenticatedFetch).toHaveBeenCalledWith(
      "/projects",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "DevLib",
          description: "Catálogo pessoal",
        }),
      }),
    );
  });

  it("lança CreateProjectError com a mensagem da API quando a criação falha", async () => {
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({ error: 'Já existe um projeto com o nome "DevLib"' }),
    } as Response);

    await expect(createProject({ name: "DevLib" })).rejects.toThrow(
      'Já existe um projeto com o nome "DevLib"',
    );
    await expect(createProject({ name: "DevLib" })).rejects.toBeInstanceOf(
      CreateProjectError,
    );
  });
});

describe("getProject", () => {
  afterEach(() => {
    vi.mocked(authenticatedFetch).mockReset();
  });

  it("retorna o projeto", async () => {
    const project = {
      id: "project-1",
      userId: "user-1",
      name: "DevLib",
      description: "Catálogo pessoal",
      createdAt: "2026-09-02T00:00:00.000Z",
      updatedAt: "2026-09-02T00:00:00.000Z",
    };
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(project),
    } as Response);

    const result = await getProject("project-1");

    expect(result).toEqual(project);
    expect(authenticatedFetch).toHaveBeenCalledWith("/projects/project-1");
  });

  it("lança GetProjectError com a mensagem da API quando a busca falha", async () => {
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Projeto não encontrado" }),
    } as Response);

    await expect(getProject("project-x")).rejects.toThrow(
      "Projeto não encontrado",
    );
    await expect(getProject("project-x")).rejects.toBeInstanceOf(
      GetProjectError,
    );
  });
});

describe("updateProject", () => {
  afterEach(() => {
    vi.mocked(authenticatedFetch).mockReset();
  });

  it("envia o body e o método PATCH corretos e retorna o projeto atualizado", async () => {
    const project = {
      id: "project-1",
      userId: "user-1",
      name: "DevLib v2",
      description: "Catálogo pessoal",
      createdAt: "2026-09-02T00:00:00.000Z",
      updatedAt: "2026-09-02T00:00:00.000Z",
    };
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(project),
    } as Response);

    const result = await updateProject("project-1", { name: "DevLib v2" });

    expect(result).toEqual(project);
    expect(authenticatedFetch).toHaveBeenCalledWith(
      "/projects/project-1",
      expect.objectContaining({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "DevLib v2" }),
      }),
    );
  });

  it("lança UpdateProjectError com a mensagem da API quando a atualização falha", async () => {
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({ error: 'Já existe um projeto com o nome "DevLib"' }),
    } as Response);

    await expect(
      updateProject("project-1", { name: "DevLib" }),
    ).rejects.toThrow('Já existe um projeto com o nome "DevLib"');
    await expect(
      updateProject("project-1", { name: "DevLib" }),
    ).rejects.toBeInstanceOf(UpdateProjectError);
  });
});

describe("listProjects", () => {
  afterEach(() => {
    vi.mocked(authenticatedFetch).mockReset();
  });

  it("retorna a lista de projetos", async () => {
    const projects = [
      {
        id: "project-1",
        userId: "user-1",
        name: "DevLib",
        description: "Catálogo pessoal",
        createdAt: "2026-09-02T00:00:00.000Z",
        updatedAt: "2026-09-02T00:00:00.000Z",
      },
    ];
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(projects),
    } as Response);

    const result = await listProjects();

    expect(result).toEqual(projects);
    expect(authenticatedFetch).toHaveBeenCalledWith("/projects");
  });

  it("lança ListProjectsError com a mensagem da API quando a listagem falha", async () => {
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Não foi possível listar" }),
    } as Response);

    await expect(listProjects()).rejects.toThrow("Não foi possível listar");
    await expect(listProjects()).rejects.toBeInstanceOf(ListProjectsError);
  });
});

describe("deleteProject", () => {
  afterEach(() => {
    vi.mocked(authenticatedFetch).mockReset();
  });

  it("envia o método DELETE, sem ler corpo quando a resposta é 204", async () => {
    const jsonMock = vi.fn();
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: true,
      status: 204,
      json: jsonMock,
    } as unknown as Response);

    await expect(deleteProject("project-1")).resolves.toBeUndefined();

    expect(authenticatedFetch).toHaveBeenCalledWith(
      "/projects/project-1",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(jsonMock).not.toHaveBeenCalled();
  });

  it("lança DeleteProjectError com a mensagem da API quando a exclusão falha", async () => {
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Projeto não encontrado" }),
    } as Response);

    await expect(deleteProject("project-x")).rejects.toThrow(
      "Projeto não encontrado",
    );
    await expect(deleteProject("project-x")).rejects.toBeInstanceOf(
      DeleteProjectError,
    );
  });
});
