import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import LibraryDetailPage from "./page";
import {
  getLibrary,
  GetLibraryError,
  getLibraryProjects,
  GetLibraryProjectsError,
} from "../../../lib/api/libraries";
import { getCategories } from "../../../lib/api/categories";
import { listLibraryTags } from "../../../lib/api/tags";
import { clearTokens, saveTokens } from "../../../lib/auth-storage";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useParams: () => ({ id: "library-1" }),
}));

vi.mock("../../../lib/api/libraries", async () => {
  const actual = await vi.importActual<
    typeof import("../../../lib/api/libraries")
  >("../../../lib/api/libraries");
  return { ...actual, getLibrary: vi.fn(), getLibraryProjects: vi.fn() };
});

vi.mock("../../../lib/api/categories", async () => {
  const actual = await vi.importActual<
    typeof import("../../../lib/api/categories")
  >("../../../lib/api/categories");
  return { ...actual, getCategories: vi.fn() };
});

vi.mock("../../../lib/api/tags", async () => {
  const actual = await vi.importActual<typeof import("../../../lib/api/tags")>(
    "../../../lib/api/tags",
  );
  return { ...actual, listLibraryTags: vi.fn() };
});

const library = {
  id: "library-1",
  name: "drizzle-orm",
  categoryId: "category-1",
  notes: "ORM leve, migrations explícitas",
  createdAt: "2026-09-03T00:00:00.000Z",
  updatedAt: "2026-09-03T00:00:00.000Z",
};

const category = {
  id: "category-1",
  projectId: null,
  name: "ORM",
  createdAt: "2026-09-03T00:00:00.000Z",
};

function renderLibraryDetailPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <LibraryDetailPage />
    </QueryClientProvider>,
  );
}

describe("LibraryDetailPage", () => {
  beforeEach(() => {
    pushMock.mockClear();
    vi.mocked(getLibrary).mockReset();
    vi.mocked(getLibraryProjects).mockReset();
    vi.mocked(getCategories).mockReset();
    vi.mocked(getCategories).mockResolvedValue([category]);
    vi.mocked(listLibraryTags).mockReset();
    vi.mocked(listLibraryTags).mockResolvedValue([]);
    clearTokens();
    saveTokens({ accessToken: "access-token", refreshToken: "refresh-token" });
  });

  it("redireciona pra /login quando não há access token", async () => {
    clearTokens();
    renderLibraryDetailPage();

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/login");
    });
  });

  it("mostra o nome, a categoria e as notas da biblioteca quando carregada", async () => {
    vi.mocked(getLibrary).mockResolvedValue(library);
    vi.mocked(getLibraryProjects).mockResolvedValue([]);
    renderLibraryDetailPage();

    await waitFor(() => {
      expect(screen.getAllByText("drizzle-orm").length).toBeGreaterThan(0);
    });
    expect(screen.getByText("ORM")).not.toBeNull();
    expect(screen.getByText("ORM leve, migrations explícitas")).not.toBeNull();
  });

  it("mostra 'Sem categoria' quando a biblioteca não tem categoryId", async () => {
    vi.mocked(getLibrary).mockResolvedValue({ ...library, categoryId: null });
    vi.mocked(getLibraryProjects).mockResolvedValue([]);
    renderLibraryDetailPage();

    await waitFor(() => {
      expect(screen.getByText("Sem categoria")).not.toBeNull();
    });
  });

  it("mostra 'Sem notas' quando a biblioteca não tem notas", async () => {
    vi.mocked(getLibrary).mockResolvedValue({ ...library, notes: null });
    vi.mocked(getLibraryProjects).mockResolvedValue([]);
    renderLibraryDetailPage();

    await waitFor(() => {
      expect(screen.getByText("Sem notas.")).not.toBeNull();
    });
  });

  it("mostra mensagem de erro quando a biblioteca não existe", async () => {
    vi.mocked(getLibrary).mockRejectedValue(
      new GetLibraryError("Biblioteca não encontrada"),
    );
    vi.mocked(getLibraryProjects).mockResolvedValue([]);
    renderLibraryDetailPage();

    await waitFor(() => {
      expect(screen.getByText("Biblioteca não encontrada")).not.toBeNull();
    });
  });

  it("mostra as tags associadas à biblioteca", async () => {
    vi.mocked(getLibrary).mockResolvedValue(library);
    vi.mocked(getLibraryProjects).mockResolvedValue([]);
    vi.mocked(listLibraryTags).mockResolvedValue([
      { id: "tag-1", name: "orm", createdAt: "2026-09-05T00:00:00.000Z" },
    ]);
    renderLibraryDetailPage();

    await waitFor(() => {
      expect(screen.getByText("orm")).not.toBeNull();
    });
  });

  it("mostra mensagem de estado vazio quando a biblioteca não tem tags", async () => {
    vi.mocked(getLibrary).mockResolvedValue(library);
    vi.mocked(getLibraryProjects).mockResolvedValue([]);
    vi.mocked(listLibraryTags).mockResolvedValue([]);
    renderLibraryDetailPage();

    await waitFor(() => {
      expect(screen.getByText(/nenhuma tag associada/i)).not.toBeNull();
    });
  });

  it("mostra a tabela de projetos onde a biblioteca é usada", async () => {
    vi.mocked(getLibrary).mockResolvedValue(library);
    vi.mocked(getLibraryProjects).mockResolvedValue([
      {
        id: "project-1",
        userId: "user-1",
        name: "DevLib",
        description: "Catálogo pessoal",
        version: "1.2.3",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      },
    ]);
    renderLibraryDetailPage();

    await waitFor(() => {
      expect(screen.getByText("DevLib")).not.toBeNull();
    });
    expect(screen.getByText("1.2.3")).not.toBeNull();
  });

  it("mostra mensagem de estado vazio quando a biblioteca não está associada a nenhum projeto", async () => {
    vi.mocked(getLibrary).mockResolvedValue(library);
    vi.mocked(getLibraryProjects).mockResolvedValue([]);
    renderLibraryDetailPage();

    await waitFor(() => {
      expect(
        screen.getByText(/não está associada a nenhum projeto/i),
      ).not.toBeNull();
    });
  });

  it("mostra mensagem de erro quando a busca dos projetos falha", async () => {
    vi.mocked(getLibrary).mockResolvedValue(library);
    vi.mocked(getLibraryProjects).mockRejectedValue(
      new GetLibraryProjectsError("Biblioteca não encontrada"),
    );
    renderLibraryDetailPage();

    await waitFor(() => {
      expect(screen.getByText("Biblioteca não encontrada")).not.toBeNull();
    });
  });
});
