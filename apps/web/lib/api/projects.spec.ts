import { afterEach, describe, expect, it, vi } from "vitest";
import {
  associateLibraryToProject,
  AssociateLibraryToProjectError,
  createProject,
  CreateProjectError,
  removeLibraryFromProject,
  RemoveLibraryFromProjectError,
  deleteProject,
  DeleteProjectError,
  getProject,
  GetProjectError,
  getProjectLibraries,
  GetProjectLibrariesError,
  getProjectsOverview,
  GetProjectsOverviewError,
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

describe("getProjectLibraries", () => {
  afterEach(() => {
    vi.mocked(authenticatedFetch).mockReset();
  });

  it("retorna as bibliotecas associadas ao projeto", async () => {
    const libraries = [
      {
        id: "library-1",
        name: "drizzle-orm",
        categoryId: "category-1",
        notes: null,
        version: "1.2.3",
        createdAt: "2026-09-03T00:00:00.000Z",
        updatedAt: "2026-09-03T00:00:00.000Z",
      },
    ];
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(libraries),
    } as Response);

    const result = await getProjectLibraries("project-1");

    expect(result).toEqual(libraries);
    expect(authenticatedFetch).toHaveBeenCalledWith(
      "/projects/project-1/libraries",
    );
  });

  it("lança GetProjectLibrariesError com a mensagem da API quando a busca falha", async () => {
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Projeto não encontrado" }),
    } as Response);

    await expect(getProjectLibraries("project-x")).rejects.toThrow(
      "Projeto não encontrado",
    );
    await expect(getProjectLibraries("project-x")).rejects.toBeInstanceOf(
      GetProjectLibrariesError,
    );
  });
});

describe("getProjectsOverview", () => {
  afterEach(() => {
    vi.mocked(authenticatedFetch).mockReset();
  });

  it("retorna os projetos do usuário com librariesCount e libraryNames", async () => {
    const overview = {
      id: "project-1",
      userId: "user-1",
      name: "DevLib",
      description: "Catálogo pessoal",
      createdAt: "2026-09-02T00:00:00.000Z",
      updatedAt: "2026-09-02T00:00:00.000Z",
      librariesCount: 3,
      libraryNames: ["drizzle-orm", "fastify", "zod"],
    };
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([overview]),
    } as Response);

    const result = await getProjectsOverview();

    expect(result).toEqual([overview]);
    expect(authenticatedFetch).toHaveBeenCalledWith("/projects/overview");
  });

  it("retorna array vazio quando o usuário não tem projetos", async () => {
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    } as Response);

    const result = await getProjectsOverview();

    expect(result).toEqual([]);
  });

  it("lança GetProjectsOverviewError com a mensagem da API quando a busca falha", async () => {
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({ error: "Não foi possível listar os projetos" }),
    } as Response);

    await expect(getProjectsOverview()).rejects.toThrow(
      "Não foi possível listar os projetos",
    );
    await expect(getProjectsOverview()).rejects.toBeInstanceOf(
      GetProjectsOverviewError,
    );
  });
});

describe("associateLibraryToProject", () => {
  afterEach(() => {
    vi.mocked(authenticatedFetch).mockReset();
  });

  const association = {
    id: "project-library-1",
    projectId: "project-1",
    libraryId: "library-1",
    version: "18.3.1",
    createdAt: "2026-10-31T00:00:00.000Z",
  };

  it("envia POST com libraryId e version e retorna a associação criada", async () => {
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(association),
    } as Response);

    const result = await associateLibraryToProject("project-1", {
      libraryId: "library-1",
      version: "18.3.1",
    });

    expect(result).toEqual(association);
    expect(authenticatedFetch).toHaveBeenCalledWith(
      "/projects/project-1/libraries",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ libraryId: "library-1", version: "18.3.1" }),
      }),
    );
  });

  it("não envia a chave version quando ela não é informada", async () => {
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ...association, version: null }),
    } as Response);

    await associateLibraryToProject("project-1", { libraryId: "library-1" });

    expect(authenticatedFetch).toHaveBeenCalledWith(
      "/projects/project-1/libraries",
      expect.objectContaining({
        body: JSON.stringify({ libraryId: "library-1" }),
      }),
    );
  });

  it("lança AssociateLibraryToProjectError com a mensagem da API quando a associação falha", async () => {
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({
          error: "Essa biblioteca já está associada ao projeto",
        }),
    } as Response);

    await expect(
      associateLibraryToProject("project-1", { libraryId: "library-1" }),
    ).rejects.toThrow("Essa biblioteca já está associada ao projeto");
    await expect(
      associateLibraryToProject("project-1", { libraryId: "library-1" }),
    ).rejects.toBeInstanceOf(AssociateLibraryToProjectError);
  });
});

describe("removeLibraryFromProject", () => {
  afterEach(() => {
    vi.mocked(authenticatedFetch).mockReset();
  });

  it("envia DELETE pra associação, sem ler corpo quando a resposta é 204", async () => {
    const json = vi.fn();
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: true,
      status: 204,
      json,
    } as unknown as Response);

    await removeLibraryFromProject("project-1", "library-1");

    expect(authenticatedFetch).toHaveBeenCalledWith(
      "/projects/project-1/libraries/library-1",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(json).not.toHaveBeenCalled();
  });

  it("lança RemoveLibraryFromProjectError com a mensagem da API quando a remoção falha", async () => {
    vi.mocked(authenticatedFetch).mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({ error: "Biblioteca não associada a esse projeto" }),
    } as Response);

    await expect(
      removeLibraryFromProject("project-1", "library-1"),
    ).rejects.toThrow("Biblioteca não associada a esse projeto");
    await expect(
      removeLibraryFromProject("project-1", "library-1"),
    ).rejects.toBeInstanceOf(RemoveLibraryFromProjectError);
  });
});
