import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProjectDetailPage from "./page";
import {
  getProject,
  GetProjectError,
  getProjectLibraries,
  GetProjectLibrariesError,
} from "../../../lib/api/projects";
import { getCategories } from "../../../lib/api/categories";
import { clearTokens, saveTokens } from "../../../lib/auth-storage";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useParams: () => ({ id: "project-1" }),
}));

vi.mock("../../../lib/api/projects", async () => {
  const actual = await vi.importActual<
    typeof import("../../../lib/api/projects")
  >("../../../lib/api/projects");
  return { ...actual, getProject: vi.fn(), getProjectLibraries: vi.fn() };
});

vi.mock("../../../lib/api/categories", async () => {
  const actual = await vi.importActual<
    typeof import("../../../lib/api/categories")
  >("../../../lib/api/categories");
  return { ...actual, getCategories: vi.fn() };
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

function renderProjectDetailPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ProjectDetailPage />
    </QueryClientProvider>,
  );
}

describe("ProjectDetailPage", () => {
  beforeEach(() => {
    pushMock.mockClear();
    vi.mocked(getProject).mockReset();
    vi.mocked(getProjectLibraries).mockReset();
    vi.mocked(getCategories).mockReset();
    vi.mocked(getCategories).mockResolvedValue([category]);
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
});
