import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Home from "./page";
import { clearTokens, saveTokens } from "../lib/auth-storage";
import { getLibrariesOverview } from "../lib/api/libraries";
import { getCategories } from "../lib/api/categories";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("../lib/api/libraries", async () => {
  const actual = await vi.importActual<typeof import("../lib/api/libraries")>(
    "../lib/api/libraries",
  );
  return { ...actual, getLibrariesOverview: vi.fn() };
});

vi.mock("../lib/api/categories", async () => {
  const actual = await vi.importActual<typeof import("../lib/api/categories")>(
    "../lib/api/categories",
  );
  return { ...actual, getCategories: vi.fn() };
});

const category = {
  id: "category-1",
  projectId: null,
  name: "ORM",
  createdAt: "2026-09-03T00:00:00.000Z",
};

function renderHome() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <Home />
    </QueryClientProvider>,
  );
}

describe("Home page", () => {
  beforeEach(() => {
    pushMock.mockClear();
    clearTokens();
    vi.mocked(getLibrariesOverview).mockReset();
    vi.mocked(getCategories).mockReset();
    vi.mocked(getLibrariesOverview).mockResolvedValue([]);
    vi.mocked(getCategories).mockResolvedValue([category]);
  });

  it("redireciona pra /login quando não há access token", async () => {
    renderHome();

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/login");
    });
  });

  it("mostra a marca e uma saudação quando autenticado", async () => {
    saveTokens({ accessToken: "access-token", refreshToken: "refresh-token" });
    renderHome();

    await waitFor(() => {
      expect(screen.getByText("devlib.dev")).not.toBeNull();
    });
  });

  it("mostra o card Projetos linkando pra /projects", async () => {
    saveTokens({ accessToken: "access-token", refreshToken: "refresh-token" });
    renderHome();

    const link = await screen.findByRole("link", { name: /projetos/i });
    expect(link.getAttribute("href")).toBe("/projects");
  });

  it("mostra Métricas e Configurações desabilitados, sem link", async () => {
    saveTokens({ accessToken: "access-token", refreshToken: "refresh-token" });
    renderHome();

    await screen.findByText("devlib.dev");

    expect(screen.queryByRole("link", { name: /métricas/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /configurações/i })).toBeNull();

    const metricas = screen.getByText("Métricas").closest("[aria-disabled]");
    expect(metricas?.getAttribute("aria-disabled")).toBe("true");

    const configuracoes = screen
      .getByText("Configurações")
      .closest("[aria-disabled]");
    expect(configuracoes?.getAttribute("aria-disabled")).toBe("true");
  });

  it("mostra a seção Bibliotecas com ação '+ Nova biblioteca' pra /libraries/new", async () => {
    saveTokens({ accessToken: "access-token", refreshToken: "refresh-token" });
    renderHome();

    await screen.findByText("Bibliotecas");
    const link = await screen.findByRole("link", { name: /nova biblioteca/i });
    expect(link.getAttribute("href")).toBe("/libraries/new");
  });

  it("mostra a tabela com nome, categoria resolvida, status e quantidade de projetos", async () => {
    saveTokens({ accessToken: "access-token", refreshToken: "refresh-token" });
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
    saveTokens({ accessToken: "access-token", refreshToken: "refresh-token" });
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
    saveTokens({ accessToken: "access-token", refreshToken: "refresh-token" });
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
    saveTokens({ accessToken: "access-token", refreshToken: "refresh-token" });
    vi.mocked(getLibrariesOverview).mockResolvedValue([]);
    renderHome();

    await waitFor(() => {
      expect(
        screen.getByText(/nenhuma biblioteca no catálogo/i),
      ).not.toBeNull();
    });
  });

  it("mostra mensagem de erro quando a busca do catálogo falha", async () => {
    saveTokens({ accessToken: "access-token", refreshToken: "refresh-token" });
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

  it("navega pro detalhe da biblioteca ao clicar na linha", async () => {
    saveTokens({ accessToken: "access-token", refreshToken: "refresh-token" });
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

    const row = await screen.findByText("drizzle-orm");
    row
      .closest("tr")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/libraries/library-1");
    });
  });
});
