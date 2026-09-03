import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createProject,
  CreateProjectError,
  getProject,
  GetProjectError,
  updateProject,
  UpdateProjectError,
} from "./projects";

describe("createProject", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("envia o body e o Authorization header corretos e retorna o projeto criado", async () => {
    const project = {
      id: "project-1",
      userId: "user-1",
      name: "DevLib",
      description: "Catálogo pessoal",
      createdAt: "2026-09-02T00:00:00.000Z",
      updatedAt: "2026-09-02T00:00:00.000Z",
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(project),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await createProject(
      { name: "DevLib", description: "Catálogo pessoal" },
      "access-token",
    );

    expect(result).toEqual(project);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/projects");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      "Content-Type": "application/json",
      Authorization: "Bearer access-token",
    });
    expect(JSON.parse(init.body)).toEqual({
      name: "DevLib",
      description: "Catálogo pessoal",
    });
  });

  it("lança CreateProjectError com a mensagem da API quando a criação falha", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({ error: 'Já existe um projeto com o nome "DevLib"' }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createProject({ name: "DevLib" }, "access-token"),
    ).rejects.toThrow('Já existe um projeto com o nome "DevLib"');
    await expect(
      createProject({ name: "DevLib" }, "access-token"),
    ).rejects.toBeInstanceOf(CreateProjectError);
  });
});

describe("getProject", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("envia o Authorization header e retorna o projeto", async () => {
    const project = {
      id: "project-1",
      userId: "user-1",
      name: "DevLib",
      description: "Catálogo pessoal",
      createdAt: "2026-09-02T00:00:00.000Z",
      updatedAt: "2026-09-02T00:00:00.000Z",
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(project),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getProject("project-1", "access-token");

    expect(result).toEqual(project);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/projects/project-1");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer access-token",
    });
  });

  it("lança GetProjectError com a mensagem da API quando a busca falha", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Projeto não encontrado" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getProject("project-x", "access-token")).rejects.toThrow(
      "Projeto não encontrado",
    );
    await expect(
      getProject("project-x", "access-token"),
    ).rejects.toBeInstanceOf(GetProjectError);
  });
});

describe("updateProject", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("envia o body, o método PATCH e o Authorization header, e retorna o projeto atualizado", async () => {
    const project = {
      id: "project-1",
      userId: "user-1",
      name: "DevLib v2",
      description: "Catálogo pessoal",
      createdAt: "2026-09-02T00:00:00.000Z",
      updatedAt: "2026-09-02T00:00:00.000Z",
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(project),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await updateProject(
      "project-1",
      { name: "DevLib v2" },
      "access-token",
    );

    expect(result).toEqual(project);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/projects/project-1");
    expect(init.method).toBe("PATCH");
    expect(init.headers).toMatchObject({
      "Content-Type": "application/json",
      Authorization: "Bearer access-token",
    });
    expect(JSON.parse(init.body)).toEqual({ name: "DevLib v2" });
  });

  it("lança UpdateProjectError com a mensagem da API quando a atualização falha", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({ error: 'Já existe um projeto com o nome "DevLib"' }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      updateProject("project-1", { name: "DevLib" }, "access-token"),
    ).rejects.toThrow('Já existe um projeto com o nome "DevLib"');
    await expect(
      updateProject("project-1", { name: "DevLib" }, "access-token"),
    ).rejects.toBeInstanceOf(UpdateProjectError);
  });
});
