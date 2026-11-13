import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
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
  getCatalogFacets,
  getLibrariesCatalog,
  GetLibrariesCatalogError,
  getLibrariesOverview,
  getLibrary,
  getLibraryProjects,
  type LibraryCatalogItem,
} from "../lib/api/libraries";
import { getCategories } from "../lib/api/categories";
import { listLibraryTags } from "../lib/api/tags";

// URL "reativa" de next/navigation — ver test/next-navigation-mock.ts
const navigation = await vi.hoisted(async () => {
  const { createNavigationMock } = await import("@/test/next-navigation-mock");
  return createNavigationMock({ pathname: "/" });
});
const pushMock = navigation.pushMock;
const replaceMock = navigation.replaceMock;

vi.mock("next/navigation", () => navigation.factory());

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
    getLibrariesCatalog: vi.fn(),
    getCatalogFacets: vi.fn(),
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

function catalogItem(
  name: string,
  extra: Partial<LibraryCatalogItem> = {},
): LibraryCatalogItem {
  return {
    id: `library-${name}`,
    name,
    categoryId: null,
    notes: null,
    createdAt: "2026-09-03T00:00:00.000Z",
    updatedAt: "2026-09-03T00:00:00.000Z",
    projectsCount: 0,
    effectiveCategories: [],
    ...extra,
  };
}

function catalogPage(
  items: LibraryCatalogItem[],
  extra: Partial<{ total: number; page: number }> = {},
) {
  return { items, total: items.length, page: 1, pageSize: 10, ...extra };
}

const facets = {
  categories: [
    { id: "category-1", name: "ORM", projectId: null, projectName: null },
    { id: "c-estado", name: "Estado", projectId: "p-1", projectName: "Alfa" },
  ],
  hasUncategorized: true,
  tags: [{ id: "t-ui", name: "ui" }],
};

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
    navigation.reset();
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
    vi.mocked(getLibrariesCatalog).mockReset();
    vi.mocked(getCatalogFacets).mockReset();
    vi.mocked(getLibrariesCatalog).mockResolvedValue(catalogPage([]));
    vi.mocked(getCatalogFacets).mockResolvedValue(facets);
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
    vi.mocked(getLibrariesCatalog)
      .mockResolvedValueOnce(catalogPage([]))
      .mockResolvedValue(catalogPage([catalogItem("drizzle-orm")]));
    vi.mocked(createLibrary).mockResolvedValue({
      id: "library-drizzle-orm",
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

  it("mostra a tabela com nome, categoria global (lib não usada), status e quantidade de projetos", async () => {
    login();
    vi.mocked(getLibrariesCatalog).mockResolvedValue(
      catalogPage([
        catalogItem("drizzle-orm", {
          categoryId: "category-1",
          projectsCount: 2,
        }),
      ]),
    );
    renderHome();

    await screen.findByText("drizzle-orm");
    expect(await screen.findByText("ORM")).not.toBeNull();
    expect(screen.getByText("2 projetos")).not.toBeNull();
  });

  it("lib usada mostra os chips das categorias efetivas no lugar da global", async () => {
    login();
    vi.mocked(getLibrariesCatalog).mockResolvedValue(
      catalogPage([
        catalogItem("react", {
          categoryId: "category-1",
          projectsCount: 2,
          effectiveCategories: [
            {
              id: "c-estado",
              name: "Estado",
              projects: [{ id: "p-1", name: "Alfa" }],
            },
            { id: null, name: null, projects: [{ id: "p-2", name: "Beta" }] },
          ],
        }),
      ]),
    );
    renderHome();

    const row = (await screen.findByText("react")).closest("tr") as HTMLElement;
    expect(within(row).getByText("Estado")).not.toBeNull();
    expect(within(row).getByText("Sem categoria")).not.toBeNull();
    expect(within(row).queryByText("ORM")).toBeNull();
  });

  it("mostra 'Sem categoria' e 'Nenhum projeto' pra lib sem categoria e sem uso", async () => {
    login();
    vi.mocked(getLibrariesCatalog).mockResolvedValue(
      catalogPage([catalogItem("drizzle-orm")]),
    );
    renderHome();

    await screen.findByText("drizzle-orm");
    expect(screen.getByText("Sem categoria")).not.toBeNull();
    expect(screen.getByText("Nenhum projeto")).not.toBeNull();
  });

  it("mostra '1 projeto' no singular quando projectsCount é 1", async () => {
    login();
    vi.mocked(getLibrariesCatalog).mockResolvedValue(
      catalogPage([catalogItem("drizzle-orm", { projectsCount: 1 })]),
    );
    renderHome();

    expect(await screen.findByText("1 projeto")).not.toBeNull();
  });

  it("catálogo vazio (sem filtros) mostra a mensagem de vazio, sem barra nem rodapé", async () => {
    login();
    renderHome();

    expect(
      await screen.findByText(/nenhuma biblioteca no catálogo/i),
    ).not.toBeNull();
    expect(
      screen.queryByRole("searchbox", { name: /buscar no catálogo/i }),
    ).toBeNull();
    expect(screen.queryByText(/^Mostrando/)).toBeNull();
  });

  it("mostra mensagem de erro quando a busca do catálogo falha", async () => {
    login();
    vi.mocked(getLibrariesCatalog).mockRejectedValue(
      new GetLibrariesCatalogError("Não foi possível buscar as bibliotecas"),
    );
    renderHome();

    expect(
      await screen.findByText("Não foi possível buscar as bibliotecas"),
    ).not.toBeNull();
  });

  it("abre o drawer de detalhe da biblioteca ao clicar na linha", async () => {
    login();
    vi.mocked(getLibrariesCatalog).mockResolvedValue(
      catalogPage([catalogItem("drizzle-orm", { notes: "ORM leve" })]),
    );
    vi.mocked(getLibrary).mockResolvedValue({
      id: "library-drizzle-orm",
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

  describe("busca, filtros e paginação do catálogo (servidor)", () => {
    const twelve = Array.from({ length: 10 }, (_, i) =>
      catalogItem(`lib-${String(i + 1).padStart(2, "0")}`),
    );

    it("pede a página à API com os filtros da URL e mostra o rodapé com o total", async () => {
      login();
      navigation.setQuery("q=lib&usage=unused&tag=t-ui&page=2");
      vi.mocked(getLibrariesCatalog).mockResolvedValue(
        catalogPage(twelve, { total: 23, page: 2 }),
      );
      renderHome();

      expect(
        await screen.findByText("Mostrando 11–20 de 23 bibliotecas"),
      ).not.toBeNull();
      expect(screen.getByText("Página 2 de 3")).not.toBeNull();
      expect(getLibrariesCatalog).toHaveBeenCalledWith({
        q: "lib",
        usage: "unused",
        tagId: "t-ui",
        page: 2,
      });
      expect(
        (
          screen.getByRole("searchbox", {
            name: /buscar no catálogo/i,
          }) as HTMLInputElement
        ).value,
      ).toBe("lib");
    });

    it("próxima página faz push na URL e pede a página seguinte", async () => {
      const user = userEvent.setup();
      login();
      vi.mocked(getLibrariesCatalog).mockResolvedValue(
        catalogPage(twelve, { total: 23 }),
      );
      renderHome();

      await user.click(
        await screen.findByRole("button", { name: /próxima página/i }),
      );

      expect(pushMock).toHaveBeenLastCalledWith("/?page=2", { scroll: false });
      await waitFor(() => {
        expect(getLibrariesCatalog).toHaveBeenLastCalledWith({ page: 2 });
      });
    });

    it("buscar faz replace na URL (depois do debounce) e volta pra página 1", async () => {
      const user = userEvent.setup();
      login();
      navigation.setQuery("page=2");
      vi.mocked(getLibrariesCatalog).mockResolvedValue(
        catalogPage(twelve, { total: 23, page: 2 }),
      );
      renderHome();

      await user.type(
        await screen.findByRole("searchbox", { name: /buscar no catálogo/i }),
        "zod",
      );

      await waitFor(() => {
        expect(replaceMock).toHaveBeenLastCalledWith("/?q=zod", {
          scroll: false,
        });
      });
      await waitFor(() => {
        expect(getLibrariesCatalog).toHaveBeenLastCalledWith({
          q: "zod",
          page: 1,
        });
      });
      expect(pushMock).not.toHaveBeenCalled();
    });

    it("filtrar por categoria de projeto usa as facetas e grava na URL", async () => {
      const user = userEvent.setup();
      login();
      vi.mocked(getLibrariesCatalog).mockResolvedValue(catalogPage(twelve));
      renderHome();

      await user.click(
        await screen.findByRole("button", { name: /^categoria$/i }),
      );
      await user.click(
        await screen.findByRole("menuitemradio", { name: "Estado · Alfa" }),
      );

      expect(replaceMock).toHaveBeenLastCalledWith("/?category=c-estado", {
        scroll: false,
      });
      await waitFor(() => {
        expect(getLibrariesCatalog).toHaveBeenLastCalledWith({
          categoryId: "c-estado",
          page: 1,
        });
      });
    });

    it("com filtro e nenhum resultado mostra o estado vazio de filtro e 'Limpar filtros' volta pra '/'", async () => {
      const user = userEvent.setup();
      login();
      navigation.setQuery("q=inexistente");
      vi.mocked(getLibrariesCatalog).mockResolvedValue(catalogPage([]));
      renderHome();

      expect(
        await screen.findByText("Nenhuma biblioteca com esses filtros."),
      ).not.toBeNull();
      expect(screen.queryByText(/^Mostrando/)).toBeNull();

      const clearButtons = screen.getAllByRole("button", {
        name: /limpar filtros/i,
      });
      await user.click(clearButtons[clearButtons.length - 1]);

      expect(replaceMock).toHaveBeenLastCalledWith("/", { scroll: false });
    });
  });
});
