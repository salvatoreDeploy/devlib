import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import NewProjectPage from "./page";
import { createProject, CreateProjectError } from "../../../lib/api/projects";
import { clearTokens, saveTokens } from "../../../lib/auth-storage";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("../../../lib/api/projects", async () => {
  const actual = await vi.importActual<
    typeof import("../../../lib/api/projects")
  >("../../../lib/api/projects");
  return { ...actual, createProject: vi.fn() };
});

function renderNewProjectPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <NewProjectPage />
    </QueryClientProvider>,
  );
}

describe("NewProjectPage", () => {
  beforeEach(() => {
    pushMock.mockClear();
    vi.mocked(createProject).mockReset();
    clearTokens();
    saveTokens({ accessToken: "access-token", refreshToken: "refresh-token" });
  });

  it("redireciona pra /login quando não há access token", async () => {
    clearTokens();
    renderNewProjectPage();

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/login");
    });
  });

  it("renderiza os campos de nome e descrição quando autenticado", async () => {
    renderNewProjectPage();

    await waitFor(() => {
      expect(screen.getByLabelText(/nome/i)).not.toBeNull();
    });
    expect(screen.getByLabelText(/descrição/i)).not.toBeNull();
  });

  it("mostra erro de validação e não chama a API quando o nome está vazio", async () => {
    renderNewProjectPage();
    await waitFor(() => expect(screen.getByLabelText(/nome/i)).not.toBeNull());

    fireEvent.click(screen.getByRole("button", { name: /criar projeto/i }));

    await waitFor(() => {
      expect(screen.getByText(/nome é obrigatório/i)).not.toBeNull();
    });
    expect(createProject).not.toHaveBeenCalled();
  });

  it("chama createProject com o access token e redireciona pra / quando criado com sucesso", async () => {
    vi.mocked(createProject).mockResolvedValue({
      id: "project-1",
      userId: "user-1",
      name: "DevLib",
      description: "Catálogo pessoal",
      createdAt: "2026-09-02T00:00:00.000Z",
      updatedAt: "2026-09-02T00:00:00.000Z",
    });
    renderNewProjectPage();
    await waitFor(() => expect(screen.getByLabelText(/nome/i)).not.toBeNull());

    fireEvent.change(screen.getByLabelText(/nome/i), {
      target: { value: "DevLib" },
    });
    fireEvent.change(screen.getByLabelText(/descrição/i), {
      target: { value: "Catálogo pessoal" },
    });
    fireEvent.click(screen.getByRole("button", { name: /criar projeto/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/");
    });
    expect(vi.mocked(createProject).mock.calls[0]).toEqual([
      { name: "DevLib", description: "Catálogo pessoal" },
      "access-token",
    ]);
  });

  it("mostra a mensagem de erro da API quando a criação falha", async () => {
    vi.mocked(createProject).mockRejectedValue(
      new CreateProjectError('Já existe um projeto com o nome "DevLib"'),
    );
    renderNewProjectPage();
    await waitFor(() => expect(screen.getByLabelText(/nome/i)).not.toBeNull());

    fireEvent.change(screen.getByLabelText(/nome/i), {
      target: { value: "DevLib" },
    });
    fireEvent.click(screen.getByRole("button", { name: /criar projeto/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Já existe um projeto com o nome "DevLib"'),
      ).not.toBeNull();
    });
  });
});
