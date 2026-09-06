import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProjectsPage from "./page";
import {
  deleteProject,
  DeleteProjectError,
  listProjects,
  ListProjectsError,
} from "../../lib/api/projects";
import { clearTokens, saveTokens } from "../../lib/auth-storage";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("../../lib/api/projects", async () => {
  const actual = await vi.importActual<typeof import("../../lib/api/projects")>(
    "../../lib/api/projects",
  );
  return { ...actual, listProjects: vi.fn(), deleteProject: vi.fn() };
});

const projectA = {
  id: "project-1",
  userId: "user-1",
  name: "DevLib",
  description: "Catálogo pessoal",
  createdAt: "2026-09-02T00:00:00.000Z",
  updatedAt: "2026-09-02T00:00:00.000Z",
};

const projectB = {
  id: "project-2",
  userId: "user-1",
  name: "Outro projeto",
  description: null,
  createdAt: "2026-09-03T00:00:00.000Z",
  updatedAt: "2026-09-03T00:00:00.000Z",
};

function renderProjectsPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ProjectsPage />
    </QueryClientProvider>,
  );
}

describe("ProjectsPage", () => {
  beforeEach(() => {
    pushMock.mockClear();
    vi.mocked(listProjects).mockReset();
    vi.mocked(deleteProject).mockReset();
    clearTokens();
    saveTokens({ accessToken: "access-token", refreshToken: "refresh-token" });
  });

  it("redireciona pra /login quando não há access token", async () => {
    clearTokens();
    renderProjectsPage();

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/login");
    });
  });

  it("mostra o link para criar projeto", async () => {
    vi.mocked(listProjects).mockResolvedValue([]);
    renderProjectsPage();

    const createLink = await screen.findByRole("link", {
      name: /criar projeto/i,
    });
    expect(createLink.getAttribute("href")).toBe("/projects/new");
  });

  it("mostra mensagem de vazio quando o usuário não tem projetos", async () => {
    vi.mocked(listProjects).mockResolvedValue([]);
    renderProjectsPage();

    expect(await screen.findByText(/nenhum projeto/i)).not.toBeNull();
  });

  it("renderiza os projetos retornados por listProjects", async () => {
    vi.mocked(listProjects).mockResolvedValue([projectA, projectB]);
    renderProjectsPage();

    expect(await screen.findByRole("link", { name: "DevLib" })).not.toBeNull();
    expect(screen.getByRole("link", { name: "Outro projeto" })).not.toBeNull();
    expect(vi.mocked(listProjects).mock.calls[0]).toEqual(["access-token"]);
  });

  it("mostra mensagem de erro quando a listagem falha", async () => {
    vi.mocked(listProjects).mockRejectedValue(
      new ListProjectsError("Sessão expirada"),
    );
    renderProjectsPage();

    expect(await screen.findByText("Sessão expirada")).not.toBeNull();
  });

  it("exclui um projeto após confirmação e atualiza a lista", async () => {
    const user = userEvent.setup();
    vi.mocked(listProjects)
      .mockResolvedValueOnce([projectA, projectB])
      .mockResolvedValueOnce([projectB]);
    vi.mocked(deleteProject).mockResolvedValue(undefined);
    renderProjectsPage();

    await screen.findByRole("link", { name: "DevLib" });
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
      expect(screen.queryByRole("link", { name: "DevLib" })).toBeNull();
    });
    expect(vi.mocked(deleteProject).mock.calls[0]).toEqual([
      "project-1",
      "access-token",
    ]);
    expect(screen.getByRole("link", { name: "Outro projeto" })).not.toBeNull();
  });

  it("mostra mensagem de erro inline quando a exclusão falha", async () => {
    const user = userEvent.setup();
    vi.mocked(listProjects).mockResolvedValue([projectA]);
    vi.mocked(deleteProject).mockRejectedValue(
      new DeleteProjectError("Projeto não encontrado"),
    );
    renderProjectsPage();

    await screen.findByRole("link", { name: "DevLib" });
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
});
