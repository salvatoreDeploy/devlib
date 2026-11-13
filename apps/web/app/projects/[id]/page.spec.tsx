import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProjectDetailPage from "./page";
import {
  getProject,
  GetProjectError,
  getProjectLibraries,
  GetProjectLibrariesError,
  removeLibraryFromProject,
  RemoveLibraryFromProjectError,
} from "../../../lib/api/projects";
import { getProjectCategories } from "../../../lib/api/categories";
import { clearTokens, saveTokens } from "../../../lib/auth-storage";

// URL "reativa" de next/navigation — ver test/next-navigation-mock.ts
const navigation = await vi.hoisted(async () => {
  const { createNavigationMock } = await import("@/test/next-navigation-mock");
  return createNavigationMock({
    pathname: "/projects/project-1",
    params: { id: "project-1" },
  });
});
const pushMock = navigation.pushMock;
const replaceMock = navigation.replaceMock;

vi.mock("next/navigation", () => navigation.factory());

vi.mock("../../../lib/api/projects", async () => {
  const actual = await vi.importActual<
    typeof import("../../../lib/api/projects")
  >("../../../lib/api/projects");
  return {
    ...actual,
    getProject: vi.fn(),
    getProjectLibraries: vi.fn(),
    removeLibraryFromProject: vi.fn(),
  };
});

vi.mock("../../../lib/api/libraries", async () => {
  const actual = await vi.importActual<
    typeof import("../../../lib/api/libraries")
  >("../../../lib/api/libraries");
  return { ...actual, getLibrariesOverview: vi.fn().mockResolvedValue([]) };
});

vi.mock("../../../lib/api/categories", async () => {
  const actual = await vi.importActual<
    typeof import("../../../lib/api/categories")
  >("../../../lib/api/categories");
  return { ...actual, getProjectCategories: vi.fn() };
});

const project = {
  id: "project-1",
  userId: "user-1",
  name: "DevLib",
  description: "Catálogo pessoal",
  createdAt: "2026-09-02T00:00:00.000Z",
  updatedAt: "2026-09-02T00:00:00.000Z",
};

const category = {
  id: "category-1",
  projectId: null,
  name: "ORM",
  createdAt: "2026-09-03T00:00:00.000Z",
};

const projectCategory = {
  id: "category-own",
  projectId: "project-1",
  name: "Infra interna",
  createdAt: "2026-09-03T00:00:00.000Z",
};

function renderProjectDetailPage(queryClient = new QueryClient()) {
  return render(
    <QueryClientProvider client={queryClient}>
      <ProjectDetailPage />
    </QueryClientProvider>,
  );
}

describe("ProjectDetailPage", () => {
  beforeEach(() => {
    navigation.reset();
    vi.mocked(getProject).mockReset();
    vi.mocked(getProjectLibraries).mockReset();
    vi.mocked(getProjectCategories).mockReset();
    vi.mocked(removeLibraryFromProject).mockReset();
    vi.mocked(getProjectCategories).mockResolvedValue([
      category,
      projectCategory,
    ]);
    clearTokens();
    saveTokens({ accessToken: "access-token", refreshToken: "refresh-token" });
  });

  it("redireciona pra /login quando não há access token", async () => {
    clearTokens();
    renderProjectDetailPage();

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/login");
    });
  });

  it("mostra o nome e a descrição do projeto quando carregado", async () => {
    vi.mocked(getProject).mockResolvedValue(project);
    vi.mocked(getProjectLibraries).mockResolvedValue([]);
    renderProjectDetailPage();

    await waitFor(() => {
      expect(screen.getAllByText("DevLib").length).toBeGreaterThan(0);
    });
    expect(screen.getByText("Catálogo pessoal")).not.toBeNull();
  });

  it("mostra mensagem de erro quando o projeto não existe ou não é do usuário", async () => {
    vi.mocked(getProject).mockRejectedValue(
      new GetProjectError("Projeto não encontrado"),
    );
    vi.mocked(getProjectLibraries).mockResolvedValue([]);
    renderProjectDetailPage();

    await waitFor(() => {
      expect(screen.getByText("Projeto não encontrado")).not.toBeNull();
    });
  });

  it("mostra a tabela com as bibliotecas associadas, resolvendo o nome da categoria", async () => {
    vi.mocked(getProject).mockResolvedValue(project);
    vi.mocked(getProjectLibraries).mockResolvedValue([
      {
        id: "library-1",
        name: "drizzle-orm",
        categoryId: "category-1",
        notes: null,
        version: "1.2.3",
        projectCategoryId: null,
        createdAt: "2026-09-03T00:00:00.000Z",
        updatedAt: "2026-09-03T00:00:00.000Z",
      },
    ]);
    renderProjectDetailPage();

    await waitFor(() => {
      expect(screen.getByText("drizzle-orm")).not.toBeNull();
    });
    expect(screen.getByText("1.2.3")).not.toBeNull();
    expect(screen.getByText("ORM")).not.toBeNull();
  });

  it("mostra 'Sem categoria' quando a biblioteca não tem categoryId", async () => {
    vi.mocked(getProject).mockResolvedValue(project);
    vi.mocked(getProjectLibraries).mockResolvedValue([
      {
        id: "library-1",
        name: "drizzle-orm",
        categoryId: null,
        notes: null,
        version: null,
        projectCategoryId: null,
        createdAt: "2026-09-03T00:00:00.000Z",
        updatedAt: "2026-09-03T00:00:00.000Z",
      },
    ]);
    renderProjectDetailPage();

    await waitFor(() => {
      expect(screen.getByText("drizzle-orm")).not.toBeNull();
    });
    expect(screen.getByText("Sem categoria")).not.toBeNull();
  });

  it("mostra mensagem de estado vazio quando o projeto não tem bibliotecas associadas", async () => {
    vi.mocked(getProject).mockResolvedValue(project);
    vi.mocked(getProjectLibraries).mockResolvedValue([]);
    renderProjectDetailPage();

    await waitFor(() => {
      expect(screen.getByText(/nenhuma biblioteca associada/i)).not.toBeNull();
    });
  });

  it("mostra mensagem de erro quando a busca das bibliotecas falha", async () => {
    vi.mocked(getProject).mockResolvedValue(project);
    vi.mocked(getProjectLibraries).mockRejectedValue(
      new GetProjectLibrariesError("Projeto não encontrado"),
    );
    renderProjectDetailPage();

    await waitFor(() => {
      expect(screen.getByText("Projeto não encontrado")).not.toBeNull();
    });
  });

  it("mostra a aba Bibliotecas ativa apontando pro projeto atual", async () => {
    vi.mocked(getProject).mockResolvedValue(project);
    vi.mocked(getProjectLibraries).mockResolvedValue([]);
    renderProjectDetailPage();

    const tab = await screen.findByRole("link", { name: /bibliotecas/i });
    expect(tab.getAttribute("href")).toBe("/projects/project-1");
  });

  it("o menu ··· de cada biblioteca abre o drawer Editar no projeto", async () => {
    const user = userEvent.setup();
    vi.mocked(getProject).mockResolvedValue(project);
    vi.mocked(getProjectLibraries).mockResolvedValue([
      {
        id: "library-1",
        name: "drizzle-orm",
        categoryId: "category-1",
        notes: null,
        version: "1.2.3",
        projectCategoryId: null,
        createdAt: "2026-09-03T00:00:00.000Z",
        updatedAt: "2026-09-03T00:00:00.000Z",
      },
    ]);
    renderProjectDetailPage();

    await user.click(
      await screen.findByRole("button", { name: "Ações de drizzle-orm" }),
    );
    await user.click(await screen.findByText("Editar no projeto"));

    expect(await screen.findByRole("dialog")).not.toBeNull();
    expect(screen.getByText(/drizzle-orm em DevLib/)).not.toBeNull();
  });

  it("o chip mostra a categoria efetiva: a do projeto quando definida, senão a global", async () => {
    vi.mocked(getProject).mockResolvedValue(project);
    vi.mocked(getProjectLibraries).mockResolvedValue([
      {
        id: "library-1",
        name: "drizzle-orm",
        categoryId: "category-1",
        notes: null,
        version: "1.2.3",
        projectCategoryId: "category-own",
        createdAt: "2026-09-03T00:00:00.000Z",
        updatedAt: "2026-09-03T00:00:00.000Z",
      },
      {
        id: "library-2",
        name: "zod",
        categoryId: "category-1",
        notes: null,
        version: null,
        projectCategoryId: null,
        createdAt: "2026-09-03T00:00:00.000Z",
        updatedAt: "2026-09-03T00:00:00.000Z",
      },
    ]);
    renderProjectDetailPage();

    await waitFor(() => {
      expect(screen.getByText("Infra interna")).not.toBeNull();
    });
    const rows = screen.getAllByRole("row");
    expect(
      rows.find((row) => row.textContent?.includes("drizzle-orm"))?.textContent,
    ).toMatch(/Infra interna/);
    expect(
      rows.find((row) => row.textContent?.includes("zod"))?.textContent,
    ).toMatch(/ORM/);
  });

  it("o botão Adicionar biblioteca abre o drawer de adicionar ao projeto", async () => {
    const user = userEvent.setup();
    vi.mocked(getProject).mockResolvedValue(project);
    vi.mocked(getProjectLibraries).mockResolvedValue([]);
    renderProjectDetailPage();

    await user.click(
      await screen.findByRole("button", { name: /adicionar biblioteca/i }),
    );

    expect(await screen.findByRole("dialog")).not.toBeNull();
    expect(
      screen.getByText(
        /busque no catálogo ou crie uma nova biblioteca para DevLib/i,
      ),
    ).not.toBeNull();
  });

  it("o botão Importar package.json abre o drawer de importação", async () => {
    const user = userEvent.setup();
    vi.mocked(getProject).mockResolvedValue(project);
    vi.mocked(getProjectLibraries).mockResolvedValue([]);
    renderProjectDetailPage();

    await user.click(
      await screen.findByRole("button", { name: /importar package\.json/i }),
    );

    expect(await screen.findByRole("dialog")).not.toBeNull();
    expect(
      screen.getByText(
        /traga para DevLib as dependências de um package\.json/i,
      ),
    ).not.toBeNull();
  });

  describe("Remover do projeto", () => {
    const drizzle = {
      id: "library-1",
      name: "drizzle-orm",
      categoryId: "category-1",
      notes: null,
      version: "1.2.3",
      projectCategoryId: null,
      createdAt: "2026-09-03T00:00:00.000Z",
      updatedAt: "2026-09-03T00:00:00.000Z",
    };

    async function openRemoveDialog(queryClient?: QueryClient) {
      const user = userEvent.setup();
      vi.mocked(getProject).mockResolvedValue(project);
      vi.mocked(getProjectLibraries).mockResolvedValue([drizzle]);
      renderProjectDetailPage(queryClient);

      await user.click(
        await screen.findByRole("button", { name: "Ações de drizzle-orm" }),
      );
      await user.click(
        await screen.findByRole("menuitem", { name: "Remover do projeto" }),
      );
      const dialog = await screen.findByRole("alertdialog");
      return { user, dialog };
    }

    it("o menu ··· abre a confirmação com o nome da biblioteca e do projeto", async () => {
      const { dialog } = await openRemoveDialog();

      expect(dialog.textContent).toMatch(/Remover do projeto/);
      expect(dialog.textContent).toMatch(/"drizzle-orm" de "DevLib"/);
      expect(dialog.textContent).toMatch(
        /versão e a categoria registradas neste projeto serão perdidas/,
      );
      expect(dialog.textContent).toMatch(/continua no catálogo/);
    });

    it("Cancelar fecha a confirmação sem chamar a API", async () => {
      const { user } = await openRemoveDialog();

      await user.click(screen.getByRole("button", { name: "Cancelar" }));

      await waitFor(() => {
        expect(screen.queryByRole("alertdialog")).toBeNull();
      });
      expect(removeLibraryFromProject).not.toHaveBeenCalled();
    });

    it("Remover chama o DELETE, fecha a confirmação e invalida as queries afetadas", async () => {
      vi.mocked(removeLibraryFromProject).mockResolvedValue(undefined);
      const queryClient = new QueryClient();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const { user } = await openRemoveDialog(queryClient);

      await user.click(screen.getByRole("button", { name: "Remover" }));

      await waitFor(() => {
        expect(removeLibraryFromProject).toHaveBeenCalledWith(
          "project-1",
          "library-1",
        );
      });
      await waitFor(() => {
        expect(screen.queryByRole("alertdialog")).toBeNull();
      });
      for (const queryKey of [
        ["project-libraries", "project-1"],
        ["library-projects", "library-1"],
        ["libraries-overview"],
        ["projects-overview"],
        ["project-categories", "project-1"],
      ]) {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey });
      }
    });

    it("quando o DELETE falha, mantém a confirmação aberta com a mensagem da API", async () => {
      vi.mocked(removeLibraryFromProject).mockRejectedValue(
        new RemoveLibraryFromProjectError(
          "Biblioteca não está associada a este projeto",
        ),
      );
      const { user, dialog } = await openRemoveDialog();

      await user.click(screen.getByRole("button", { name: "Remover" }));

      expect((await screen.findByRole("alert")).textContent).toBe(
        "Biblioteca não está associada a este projeto",
      );
      expect(screen.getByRole("alertdialog")).toBe(dialog);
    });

    it("ao reabrir depois de uma falha, a confirmação não mostra o erro anterior", async () => {
      vi.mocked(removeLibraryFromProject).mockRejectedValue(
        new RemoveLibraryFromProjectError("erro qualquer"),
      );
      const { user } = await openRemoveDialog();
      await user.click(screen.getByRole("button", { name: "Remover" }));
      await screen.findByRole("alert");

      await user.click(screen.getByRole("button", { name: "Cancelar" }));
      await waitFor(() => {
        expect(screen.queryByRole("alertdialog")).toBeNull();
      });
      await user.click(
        await screen.findByRole("button", { name: "Ações de drizzle-orm" }),
      );
      await user.click(
        await screen.findByRole("menuitem", { name: "Remover do projeto" }),
      );

      await screen.findByRole("alertdialog");
      expect(screen.queryByRole("alert")).toBeNull();
    });
  });

  describe("busca, filtros e paginação", () => {
    function libraryNamed(
      name: string,
      extra: Partial<{
        categoryId: string | null;
        projectCategoryId: string | null;
        version: string | null;
      }> = {},
    ) {
      return {
        id: `library-${name}`,
        name,
        categoryId: null,
        notes: null,
        version: "1.0.0",
        projectCategoryId: null,
        createdAt: "2026-09-03T00:00:00.000Z",
        updatedAt: "2026-09-03T00:00:00.000Z",
        ...extra,
      };
    }

    // 12 libs: lib-01..lib-11 + "zustand" (categoria do projeto, sem versão)
    const twelve = [
      ...Array.from({ length: 11 }, (_, i) =>
        libraryNamed(`lib-${String(i + 1).padStart(2, "0")}`, {
          categoryId: i < 3 ? "category-1" : null,
        }),
      ),
      libraryNamed("zustand", {
        projectCategoryId: "category-own",
        version: null,
      }),
    ];

    function rowNames() {
      return screen
        .getAllByRole("row")
        .slice(1)
        .map((row) => row.querySelector("td")?.textContent);
    }

    async function renderWith(libraries = twelve, search = "") {
      navigation.setQuery(search);
      vi.mocked(getProject).mockResolvedValue(project);
      vi.mocked(getProjectLibraries).mockResolvedValue(libraries);
      renderProjectDetailPage();
      await screen.findByRole("searchbox", { name: /buscar bibliotecas/i });
    }

    it("mostra 10 por página, por nome, com o rodapé de paginação", async () => {
      await renderWith([...twelve].reverse());

      await waitFor(() => {
        expect(rowNames()).toHaveLength(10);
      });
      expect(rowNames()[0]).toBe("lib-01");
      expect(
        screen.getByText("Mostrando 1–10 de 12 bibliotecas"),
      ).not.toBeNull();
      expect(screen.getByText("Página 1 de 2")).not.toBeNull();
    });

    it("próxima página faz push na URL e mostra o restante", async () => {
      const user = userEvent.setup();
      await renderWith();

      await user.click(
        await screen.findByRole("button", { name: /próxima página/i }),
      );

      expect(pushMock).toHaveBeenLastCalledWith("/projects/project-1?page=2", {
        scroll: false,
      });
      expect(rowNames()).toEqual(["lib-11", "zustand"]);
      expect(
        screen.getByText("Mostrando 11–12 de 12 bibliotecas"),
      ).not.toBeNull();
    });

    it("lê busca, filtros e página da URL ao abrir", async () => {
      await renderWith(twelve, "q=LIB-0&page=1");

      await waitFor(() => {
        expect(rowNames()).toHaveLength(9);
      });
      expect(
        (
          screen.getByRole("searchbox", {
            name: /buscar bibliotecas/i,
          }) as HTMLInputElement
        ).value,
      ).toBe("LIB-0");
    });

    it("buscar troca a URL com replace e volta pra página 1", async () => {
      const user = userEvent.setup();
      await renderWith(twelve, "page=2");

      await user.type(
        screen.getByRole("searchbox", { name: /buscar bibliotecas/i }),
        "zus",
      );

      expect(replaceMock).toHaveBeenLastCalledWith(
        "/projects/project-1?q=zus",
        { scroll: false },
      );
      expect(rowNames()).toEqual(["zustand"]);
      expect(pushMock).not.toHaveBeenCalled();
    });

    it("dá pra digitar uma busca com espaço (o espaço não some ao reler da URL)", async () => {
      const user = userEvent.setup();
      await renderWith([
        ...twelve,
        libraryNamed("react query"),
        libraryNamed("react"),
      ]);

      const search = screen.getByRole("searchbox", {
        name: /buscar bibliotecas/i,
      });
      await user.type(search, "react q");

      expect((search as HTMLInputElement).value).toBe("react q");
      expect(rowNames()).toEqual(["react query"]);
    });

    it("filtro de categoria oferece só as categorias presentes no projeto e filtra pela efetiva", async () => {
      const user = userEvent.setup();
      await renderWith();

      await user.click(screen.getByRole("button", { name: /^categoria$/i }));
      const items = await screen.findAllByRole("menuitemradio");
      expect(items.map((item) => item.textContent)).toEqual([
        "Todas as categorias",
        "Infra interna",
        "ORM",
        "Sem categoria",
      ]);

      await user.click(
        screen.getByRole("menuitemradio", { name: "Infra interna" }),
      );

      expect(replaceMock).toHaveBeenLastCalledWith(
        "/projects/project-1?category=category-own",
        { scroll: false },
      );
      expect(rowNames()).toEqual(["zustand"]);
    });

    it("filtro 'Sem versão' mostra só as libs sem versão", async () => {
      const user = userEvent.setup();
      await renderWith();

      await user.click(screen.getByRole("button", { name: /^versão$/i }));
      await user.click(
        await screen.findByRole("menuitemradio", { name: "Sem versão" }),
      );

      expect(rowNames()).toEqual(["zustand"]);
    });

    it("sem resultado mostra o estado vazio e 'Limpar filtros' volta pra lista completa", async () => {
      const user = userEvent.setup();
      await renderWith(twelve, "q=inexistente");

      expect(
        await screen.findByText("Nenhuma biblioteca com esses filtros."),
      ).not.toBeNull();
      expect(
        screen.getByText(
          /12 bibliotecas no projeto — ajuste a busca ou limpe os filtros/i,
        ),
      ).not.toBeNull();
      expect(screen.queryByText(/^Mostrando/)).toBeNull();

      const clearButtons = screen.getAllByRole("button", {
        name: /limpar filtros/i,
      });
      await user.click(clearButtons[clearButtons.length - 1]);

      expect(replaceMock).toHaveBeenLastCalledWith("/projects/project-1", {
        scroll: false,
      });
      expect(rowNames()).toHaveLength(10);
    });

    it("página da URL além da última mostra a última", async () => {
      await renderWith(twelve, "page=9");

      await waitFor(() => {
        expect(screen.getByText("Página 2 de 2")).not.toBeNull();
      });
      expect(rowNames()).toEqual(["lib-11", "zustand"]);
    });

    it("projeto sem bibliotecas mantém a mensagem de vazio, sem barra de filtros nem rodapé", async () => {
      vi.mocked(getProject).mockResolvedValue(project);
      vi.mocked(getProjectLibraries).mockResolvedValue([]);
      renderProjectDetailPage();

      expect(
        await screen.findByText(
          "Nenhuma biblioteca associada a este projeto ainda.",
        ),
      ).not.toBeNull();
      expect(
        screen.queryByRole("searchbox", { name: /buscar bibliotecas/i }),
      ).toBeNull();
      expect(screen.queryByText(/^Mostrando/)).toBeNull();
    });
  });
});
