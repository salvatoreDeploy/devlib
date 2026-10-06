import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProjectCategoriesPage from "./page";
import {
  getProject,
  GetProjectError,
  getProjectLibraries,
} from "../../../../lib/api/projects";
import {
  getProjectCategories,
  GetProjectCategoriesError,
  createProjectCategory,
  deleteProjectCategory,
} from "../../../../lib/api/categories";
import { clearTokens, saveTokens } from "../../../../lib/auth-storage";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useParams: () => ({ id: "project-1" }),
  usePathname: () => "/projects/project-1/categories",
}));

vi.mock("../../../../lib/api/projects", async () => {
  const actual = await vi.importActual<
    typeof import("../../../../lib/api/projects")
  >("../../../../lib/api/projects");
  return { ...actual, getProject: vi.fn(), getProjectLibraries: vi.fn() };
});

vi.mock("../../../../lib/api/categories", async () => {
  const actual = await vi.importActual<
    typeof import("../../../../lib/api/categories")
  >("../../../../lib/api/categories");
  return {
    ...actual,
    getProjectCategories: vi.fn(),
    createProjectCategory: vi.fn(),
    deleteProjectCategory: vi.fn(),
  };
});

const project = {
  id: "project-1",
  userId: "user-1",
  name: "DevLib",
  description: "Catálogo pessoal",
  createdAt: "2026-09-02T00:00:00.000Z",
  updatedAt: "2026-09-02T00:00:00.000Z",
};

const globalCategory = {
  id: "category-1",
  projectId: null,
  name: "Frontend",
  createdAt: "2026-09-03T00:00:00.000Z",
};

const projectCategory = {
  id: "category-2",
  projectId: "project-1",
  name: "Infra interna",
  createdAt: "2026-09-03T00:00:00.000Z",
};

function library(overrides: Partial<{ categoryId: string | null }> = {}) {
  return {
    id: "library-1",
    name: "drizzle-orm",
    categoryId: null,
    notes: null,
    version: null,
    createdAt: "2026-09-03T00:00:00.000Z",
    updatedAt: "2026-09-03T00:00:00.000Z",
    ...overrides,
  };
}

function renderPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ProjectCategoriesPage />
    </QueryClientProvider>,
  );
}

describe("ProjectCategoriesPage", () => {
  beforeEach(() => {
    pushMock.mockClear();
    vi.mocked(getProject).mockReset();
    vi.mocked(getProjectLibraries).mockReset();
    vi.mocked(getProjectCategories).mockReset();
    vi.mocked(createProjectCategory).mockReset();
    vi.mocked(deleteProjectCategory).mockReset();
    vi.mocked(getProjectLibraries).mockResolvedValue([]);
    clearTokens();
    saveTokens({ accessToken: "access-token", refreshToken: "refresh-token" });
  });

  it("redireciona pra /login quando não há access token", async () => {
    clearTokens();
    renderPage();

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/login");
    });
  });

  it("mostra as categorias globais e as do projeto, com a contagem de bibliotecas do projeto", async () => {
    vi.mocked(getProject).mockResolvedValue(project);
    vi.mocked(getProjectCategories).mockResolvedValue([
      globalCategory,
      projectCategory,
    ]);
    vi.mocked(getProjectLibraries).mockResolvedValue([
      library({ categoryId: "category-1" }),
      library({ categoryId: "category-1" }),
      library({ categoryId: "category-2" }),
    ]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Frontend")).not.toBeNull();
    });
    expect(screen.getByText("Infra interna")).not.toBeNull();
    expect(screen.getByText("2 bibliotecas")).not.toBeNull();
    expect(screen.getByText("1 biblioteca")).not.toBeNull();
  });

  it("mostra 0 bibliotecas quando nenhuma biblioteca do projeto usa a categoria", async () => {
    vi.mocked(getProject).mockResolvedValue(project);
    vi.mocked(getProjectCategories).mockResolvedValue([globalCategory]);
    vi.mocked(getProjectLibraries).mockResolvedValue([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("0 bibliotecas")).not.toBeNull();
    });
  });

  it("mostra mensagem de erro quando a busca das categorias falha", async () => {
    vi.mocked(getProject).mockResolvedValue(project);
    vi.mocked(getProjectCategories).mockRejectedValue(
      new GetProjectCategoriesError("Projeto não encontrado"),
    );
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Projeto não encontrado")).not.toBeNull();
    });
  });

  it("mostra mensagem de erro quando o projeto não existe ou não é do usuário", async () => {
    vi.mocked(getProject).mockRejectedValue(
      new GetProjectError("Projeto não encontrado"),
    );
    vi.mocked(getProjectCategories).mockResolvedValue([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Projeto não encontrado")).not.toBeNull();
    });
  });

  it("mostra mensagem de estado vazio quando não há categorias", async () => {
    vi.mocked(getProject).mockResolvedValue(project);
    vi.mocked(getProjectCategories).mockResolvedValue([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/nenhuma categoria/i)).not.toBeNull();
    });
  });

  it("mostra o footer com a contagem total de categorias", async () => {
    vi.mocked(getProject).mockResolvedValue(project);
    vi.mocked(getProjectCategories).mockResolvedValue([
      globalCategory,
      projectCategory,
    ]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Mostrando 2 de 2 categorias")).not.toBeNull();
    });
  });

  it("filtra as categorias pelo campo de busca", async () => {
    vi.mocked(getProject).mockResolvedValue(project);
    vi.mocked(getProjectCategories).mockResolvedValue([
      globalCategory,
      projectCategory,
    ]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Frontend")).not.toBeNull();
    });

    const search = screen.getByPlaceholderText("buscar categorias");
    await userEvent.type(search, "infra");

    expect(screen.queryByText("Frontend")).toBeNull();
    expect(screen.getByText("Infra interna")).not.toBeNull();
    expect(screen.getByText("Mostrando 1 de 2 categorias")).not.toBeNull();
  });

  it("mostra o menu de ações só pra categorias do próprio projeto, não pras globais", async () => {
    vi.mocked(getProject).mockResolvedValue(project);
    vi.mocked(getProjectCategories).mockResolvedValue([
      globalCategory,
      projectCategory,
    ]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Frontend")).not.toBeNull();
    });

    expect(screen.getAllByRole("button", { name: "···" })).toHaveLength(1);
  });

  it("exclui a categoria do projeto ao confirmar no menu de ações", async () => {
    vi.mocked(getProject).mockResolvedValue(project);
    vi.mocked(getProjectCategories).mockResolvedValue([projectCategory]);
    vi.mocked(deleteProjectCategory).mockResolvedValue(undefined);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Infra interna")).not.toBeNull();
    });

    await userEvent.click(screen.getByRole("button", { name: "···" }));
    await userEvent.click(await screen.findByText("Excluir"));
    await userEvent.click(
      await screen.findByRole("button", { name: "Excluir" }),
    );

    await waitFor(() => {
      expect(deleteProjectCategory).toHaveBeenCalledWith(
        "project-1",
        "category-2",
      );
    });
  });

  it("abre o drawer 'Criar categoria' ao clicar no botão", async () => {
    vi.mocked(getProject).mockResolvedValue(project);
    vi.mocked(getProjectCategories).mockResolvedValue([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Nenhuma categoria ainda.")).not.toBeNull();
    });

    await userEvent.click(
      screen.getByRole("button", { name: /criar categoria/i }),
    );

    expect(await screen.findByLabelText(/nome/i)).not.toBeNull();
  });

  it("cria a categoria, fecha o drawer e atualiza a lista", async () => {
    vi.mocked(getProject).mockResolvedValue(project);
    vi.mocked(getProjectCategories)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([projectCategory]);
    vi.mocked(createProjectCategory).mockResolvedValue(projectCategory);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Nenhuma categoria ainda.")).not.toBeNull();
    });

    await userEvent.click(
      screen.getByRole("button", { name: /criar categoria/i }),
    );
    await userEvent.type(
      await screen.findByLabelText(/nome/i),
      "Infra interna",
    );
    await userEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(createProjectCategory).toHaveBeenCalledWith("project-1", {
        name: "Infra interna",
      });
    });
    expect(screen.queryByLabelText(/nome/i)).toBeNull();
    await waitFor(() => {
      expect(screen.getByText("Infra interna")).not.toBeNull();
    });
  });

  it("mostra a aba Categorias ativa", async () => {
    vi.mocked(getProject).mockResolvedValue(project);
    vi.mocked(getProjectCategories).mockResolvedValue([]);
    renderPage();

    const tab = await screen.findByRole("link", { name: /categorias/i });
    expect(tab.getAttribute("aria-current")).toBe("page");
  });
});
