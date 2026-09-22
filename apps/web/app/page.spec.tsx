import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Home from "./page";
import { clearTokens, saveTokens } from "../lib/auth-storage";
import {
  createProject,
  deleteProject,
  DeleteProjectError,
  getProjectsOverview,
  GetProjectsOverviewError,
} from "../lib/api/projects";
import {
  createLibrary,
  getLibrariesOverview,
  getLibrary,
  getLibraryProjects,
} from "../lib/api/libraries";
import { getCategories } from "../lib/api/categories";
import { listLibraryTags } from "../lib/api/tags";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("../lib/api/projects", async () => {
  const actual = await vi.importActual<typeof import("../lib/api/projects")>(
    "../lib/api/projects",
  );
  return {
    ...actual,
    getProjectsOverview: vi.fn(),
    deleteProject: vi.fn(),
    createProject: vi.fn(),
  };
});

vi.mock("../lib/api/libraries", async () => {
  const actual = await vi.importActual<typeof import("../lib/api/libraries")>(
    "../lib/api/libraries",
  );
  return {
    ...actual,
    getLibrariesOverview: vi.fn(),
    createLibrary: vi.fn(),
    getLibrary: vi.fn(),
    getLibraryProjects: vi.fn(),
  };
});

vi.mock("../lib/api/categories", async () => {
  const actual = await vi.importActual<typeof import("../lib/api/categories")>(
    "../lib/api/categories",
  );
  return { ...actual, getCategories: vi.fn() };
});

vi.mock("../lib/api/tags", async () => {
  const actual =
    await vi.importActual<typeof import("../lib/api/tags")>("../lib/api/tags");
  return { ...actual, listLibraryTags: vi.fn() };
});

const category = {
  id: "category-1",
  projectId: null,
  name: "ORM",
  createdAt: "2026-09-03T00:00:00.000Z",
};

const projectA = {
  id: "project-1",
  userId: "user-1",
  name: "Projeto A",
  description: null,
  createdAt: "2026-09-05T00:00:00.000Z",
  updatedAt: "2026-09-05T00:00:00.000Z",
  librariesCount: 3,
  libraryNames: ["drizzle-orm", "fastify", "zod"],
};
const projectB = { ...projectA, id: "project-2", name: "Projeto B" };
const projectC = { ...projectA, id: "project-3", name: "Projeto C" };
const projectD = { ...projectA, id: "project-4", name: "Projeto D" };
const projectE = { ...projectA, id: "project-5", name: "Projeto E" };

function renderHome() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <Home />
    </QueryClientProvider>,
  );
}

function login() {
  saveTokens({ accessToken: "access-token", refreshToken: "refresh-token" });
}

describe("Home page", () => {
  beforeEach(() => {
    pushMock.mockClear();
    clearTokens();
    vi.mocked(getProjectsOverview).mockReset();
    vi.mocked(deleteProject).mockReset();
    vi.mocked(createProject).mockReset();
    vi.mocked(getLibrariesOverview).mockReset();
    vi.mocked(createLibrary).mockReset();
    vi.mocked(getLibrary).mockReset();
    vi.mocked(getLibraryProjects).mockReset();
    vi.mocked(listLibraryTags).mockReset();
    vi.mocked(getCategories).mockReset();
    vi.mocked(getProjectsOverview).mockResolvedValue([]);
    vi.mocked(getLibrariesOverview).mockResolvedValue([]);
    vi.mocked(getCategories).mockResolvedValue([category]);
    vi.mocked(listLibraryTags).mockResolvedValue([]);
  });

  it("redireciona pra /login quando não há access token", async () => {
    renderHome();

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/login");
    });
  });

  it("mostra a marca devlib.dev quando autenticado", async () => {
    login();
    renderHome();

    await waitFor(() => {
      expect(screen.getByText("devlib.dev")).not.toBeNull();
    });
  });

  it("mostra o título Projetos e abre o drawer Criar projeto ao clicar no botão", async () => {
    const user = userEvent.setup();
    login();
    renderHome();

    await screen.findByText("devlib.dev");
    expect(screen.getByRole("heading", { name: "Projetos" })).not.toBeNull();
    await user.click(screen.getByRole("button", { name: /criar projeto/i }));

    expect(
      await screen.findByRole("heading", { name: "Criar projeto" }),
    ).not.toBeNull();
  });

  it("cria um projeto pelo drawer, fecha e atualiza a lista", async () => {
    const user = userEvent.setup();
    login();
    vi.mocked(getProjectsOverview)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([projectA]);
    vi.mocked(createProject).mockResolvedValue(projectA);
    renderHome();

    await user.click(screen.getByRole("button", { name: /criar projeto/i }));
    await screen.findByRole("heading", { name: "Criar projeto" });
    await user.type(screen.getByLabelText(/nome do projeto/i), "Projeto A");
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Criar projeto" }),
      ).toBeNull();
    });
    expect(
      await screen.findByRole("link", { name: "Projeto A" }),
    ).not.toBeNull();
  });

  it("mostra o link Ver todos os projetos linkando pra /projects", async () => {
    login();
    renderHome();

    const link = await screen.findByRole("link", {
      name: /ver todos os projetos/i,
    });
    expect(link.getAttribute("href")).toBe("/projects");
  });

  it("renderiza os projetos retornados por getProjectsOverview", async () => {
    login();
    vi.mocked(getProjectsOverview).mockResolvedValue([projectA, projectB]);
    renderHome();

    expect(
      await screen.findByRole("link", { name: "Projeto A" }),
    ).not.toBeNull();
    expect(screen.getByRole("link", { name: "Projeto B" })).not.toBeNull();
    expect(vi.mocked(getProjectsOverview).mock.calls[0]).toEqual([]);
  });

  it("mostra no máximo 4 projetos, mesmo quando o usuário tem mais", async () => {
    login();
    vi.mocked(getProjectsOverview).mockResolvedValue([
      projectA,
      projectB,
      projectC,
      projectD,
      projectE,
    ]);
    renderHome();

    expect(
      await screen.findByRole("link", { name: "Projeto D" }),
    ).not.toBeNull();
    expect(screen.queryByRole("link", { name: "Projeto E" })).toBeNull();
  });

  it("mostra mensagem de vazio quando o usuário não tem projetos", async () => {
    login();
    vi.mocked(getProjectsOverview).mockResolvedValue([]);
    renderHome();

    expect(await screen.findByText(/nenhum projeto/i)).not.toBeNull();
  });

  it("mostra mensagem de erro quando a listagem de projetos falha", async () => {
    login();
    vi.mocked(getProjectsOverview).mockRejectedValue(
      new GetProjectsOverviewError("Sessão expirada"),
    );
    renderHome();

    expect(await screen.findByText("Sessão expirada")).not.toBeNull();
  });

  it("exclui um projeto a partir do card e atualiza a lista", async () => {
    const user = userEvent.setup();
    login();
    vi.mocked(getProjectsOverview)
      .mockResolvedValueOnce([projectA, projectB])
      .mockResolvedValueOnce([projectB]);
    vi.mocked(deleteProject).mockResolvedValue(undefined);
    renderHome();

    await screen.findByRole("link", { name: "Projeto A" });
    const cards = screen.getAllByRole("button", { name: "···" });
    await user.click(cards[0]);
    await user.click(screen.getByRole("menuitem", { name: /excluir/i }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(
      screen
        .getAllByRole("button", { name: /^excluir$/i })
        .find((button) => dialog.contains(button))!,
    );

    await waitFor(() => {
      expect(screen.queryByRole("link", { name: "Projeto A" })).toBeNull();
    });
    expect(vi.mocked(deleteProject).mock.calls[0]).toEqual(["project-1"]);
  });

  it("mostra mensagem de erro inline quando a exclusão de projeto falha", async () => {
    const user = userEvent.setup();
    login();
    vi.mocked(getProjectsOverview).mockResolvedValue([projectA]);
    vi.mocked(deleteProject).mockRejectedValue(
      new DeleteProjectError("Projeto não encontrado"),
    );
    renderHome();

    await screen.findByRole("link", { name: "Projeto A" });
    await user.click(screen.getByRole("button", { name: "···" }));
    await user.click(screen.getByRole("menuitem", { name: /excluir/i }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(
      screen
        .getAllByRole("button", { name: /^excluir$/i })
        .find((button) => dialog.contains(button))!,
    );

    expect(await screen.findByText("Projeto não encontrado")).not.toBeNull();
  });

  it("mostra a seção Bibliotecas e abre o drawer Criar biblioteca ao clicar em '+ Nova biblioteca'", async () => {
    const user = userEvent.setup();
    login();
    renderHome();

    await screen.findByText("Bibliotecas");
    await user.click(screen.getByRole("button", { name: /nova biblioteca/i }));

    expect(
      await screen.findByRole("heading", { name: "Criar biblioteca" }),
    ).not.toBeNull();
  });

  it("cria uma biblioteca pelo drawer, fecha e atualiza a seção Bibliotecas", async () => {
    const user = userEvent.setup();
    login();
    vi.mocked(getLibrariesOverview)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "library-1",
          name: "drizzle-orm",
          categoryId: null,
          notes: null,
          createdAt: "2026-09-03T00:00:00.000Z",
          updatedAt: "2026-09-03T00:00:00.000Z",
          projectsCount: 0,
        },
      ]);
    vi.mocked(createLibrary).mockResolvedValue({
      id: "library-1",
      name: "drizzle-orm",
      categoryId: null,
      notes: null,
      createdAt: "2026-09-03T00:00:00.000Z",
      updatedAt: "2026-09-03T00:00:00.000Z",
    });
    renderHome();

    await screen.findByText("Bibliotecas");
    await user.click(screen.getByRole("button", { name: /nova biblioteca/i }));
    await screen.findByRole("heading", { name: "Criar biblioteca" });
    await user.type(
      screen.getByLabelText(/nome da biblioteca/i),
      "drizzle-orm",
    );
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Criar biblioteca" }),
      ).toBeNull();
    });
    expect(await screen.findByText("drizzle-orm")).not.toBeNull();
  });

  it("mostra a tabela com nome, categoria resolvida, status e quantidade de projetos", async () => {
    login();
    vi.mocked(getLibrariesOverview).mockResolvedValue([
      {
        id: "library-1",
        name: "drizzle-orm",
        categoryId: "category-1",
        notes: null,
        createdAt: "2026-09-03T00:00:00.000Z",
        updatedAt: "2026-09-03T00:00:00.000Z",
        projectsCount: 2,
      },
    ]);
    renderHome();

    await waitFor(() => {
      expect(screen.getByText("drizzle-orm")).not.toBeNull();
    });
    expect(screen.getByText("ORM")).not.toBeNull();
    expect(screen.getByText("2 projetos")).not.toBeNull();
  });

  it("mostra 'Sem categoria' quando a biblioteca não tem categoryId", async () => {
    login();
    vi.mocked(getLibrariesOverview).mockResolvedValue([
      {
        id: "library-1",
        name: "drizzle-orm",
        categoryId: null,
        notes: null,
        createdAt: "2026-09-03T00:00:00.000Z",
        updatedAt: "2026-09-03T00:00:00.000Z",
        projectsCount: 0,
      },
    ]);
    renderHome();

    await waitFor(() => {
      expect(screen.getByText("drizzle-orm")).not.toBeNull();
    });
    expect(screen.getByText("Sem categoria")).not.toBeNull();
    expect(screen.getByText("Nenhum projeto")).not.toBeNull();
  });

  it("mostra '1 projeto' no singular quando projectsCount é 1", async () => {
    login();
    vi.mocked(getLibrariesOverview).mockResolvedValue([
      {
        id: "library-1",
        name: "drizzle-orm",
        categoryId: null,
        notes: null,
        createdAt: "2026-09-03T00:00:00.000Z",
        updatedAt: "2026-09-03T00:00:00.000Z",
        projectsCount: 1,
      },
    ]);
    renderHome();

    await waitFor(() => {
      expect(screen.getByText("1 projeto")).not.toBeNull();
    });
  });

  it("mostra mensagem de estado vazio quando o catálogo não tem bibliotecas", async () => {
    login();
    vi.mocked(getLibrariesOverview).mockResolvedValue([]);
    renderHome();

    await waitFor(() => {
      expect(
        screen.getByText(/nenhuma biblioteca no catálogo/i),
      ).not.toBeNull();
    });
  });

  it("mostra mensagem de erro quando a busca do catálogo falha", async () => {
    login();
    const { GetLibrariesOverviewError } = await vi.importActual<
      typeof import("../lib/api/libraries")
    >("../lib/api/libraries");
    vi.mocked(getLibrariesOverview).mockRejectedValue(
      new GetLibrariesOverviewError("Não foi possível buscar as bibliotecas"),
    );
    renderHome();

    await waitFor(() => {
      expect(
        screen.getByText("Não foi possível buscar as bibliotecas"),
      ).not.toBeNull();
    });
  });

  it("abre o drawer de detalhe da biblioteca ao clicar na linha", async () => {
    login();
    vi.mocked(getLibrariesOverview).mockResolvedValue([
      {
        id: "library-1",
        name: "drizzle-orm",
        categoryId: null,
        notes: "ORM leve",
        createdAt: "2026-09-03T00:00:00.000Z",
        updatedAt: "2026-09-03T00:00:00.000Z",
        projectsCount: 0,
      },
    ]);
    vi.mocked(getLibrary).mockResolvedValue({
      id: "library-1",
      name: "drizzle-orm",
      categoryId: null,
      notes: "ORM leve",
      createdAt: "2026-09-03T00:00:00.000Z",
      updatedAt: "2026-09-03T00:00:00.000Z",
    });
    vi.mocked(getLibraryProjects).mockResolvedValue([]);
    renderHome();

    const row = await screen.findByText("drizzle-orm");
    row
      .closest("tr")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    await waitFor(() => {
      expect(screen.getByText("ORM leve")).not.toBeNull();
    });
    expect(pushMock).not.toHaveBeenCalled();
  });
});
