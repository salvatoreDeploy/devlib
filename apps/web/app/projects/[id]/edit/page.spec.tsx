import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import EditProjectPage from "./page";
import {
  getProject,
  GetProjectError,
  updateProject,
  UpdateProjectError,
} from "../../../../lib/api/projects";
import { clearTokens, saveTokens } from "../../../../lib/auth-storage";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useParams: () => ({ id: "project-1" }),
}));

vi.mock("../../../../lib/api/projects", async () => {
  const actual = await vi.importActual<
    typeof import("../../../../lib/api/projects")
  >("../../../../lib/api/projects");
  return { ...actual, getProject: vi.fn(), updateProject: vi.fn() };
});

const project = {
  id: "project-1",
  userId: "user-1",
  name: "DevLib",
  description: "Catálogo pessoal",
  createdAt: "2026-09-02T00:00:00.000Z",
  updatedAt: "2026-09-02T00:00:00.000Z",
};

function renderEditProjectPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <EditProjectPage />
    </QueryClientProvider>,
  );
}

describe("EditProjectPage", () => {
  beforeEach(() => {
    pushMock.mockClear();
    vi.mocked(getProject).mockReset();
    vi.mocked(updateProject).mockReset();
    clearTokens();
    saveTokens({ accessToken: "access-token", refreshToken: "refresh-token" });
  });

  it("redireciona pra /login quando não há access token", async () => {
    clearTokens();
    renderEditProjectPage();

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/login");
    });
  });

  it("busca o projeto e pré-preenche o formulário", async () => {
    vi.mocked(getProject).mockResolvedValue(project);
    renderEditProjectPage();

    await waitFor(() => {
      expect(screen.getByDisplayValue("DevLib")).not.toBeNull();
    });
    expect(screen.getByDisplayValue("Catálogo pessoal")).not.toBeNull();
    expect(vi.mocked(getProject).mock.calls[0]).toEqual([
      "project-1",
      "access-token",
    ]);
  });

  it("mostra mensagem de erro quando a busca do projeto falha", async () => {
    vi.mocked(getProject).mockRejectedValue(
      new GetProjectError("Projeto não encontrado"),
    );
    renderEditProjectPage();

    await waitFor(() => {
      expect(screen.getByText("Projeto não encontrado")).not.toBeNull();
    });
  });

  it("mostra erro de validação e não chama a API quando o nome fica vazio", async () => {
    vi.mocked(getProject).mockResolvedValue(project);
    renderEditProjectPage();
    await waitFor(() =>
      expect(screen.getByDisplayValue("DevLib")).not.toBeNull(),
    );

    fireEvent.change(screen.getByLabelText(/nome/i), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(screen.getByText(/nome é obrigatório/i)).not.toBeNull();
    });
    expect(updateProject).not.toHaveBeenCalled();
  });

  it("chama updateProject com o access token e redireciona pra / quando salvo com sucesso", async () => {
    vi.mocked(getProject).mockResolvedValue(project);
    vi.mocked(updateProject).mockResolvedValue({
      ...project,
      name: "DevLib v2",
    });
    renderEditProjectPage();
    await waitFor(() =>
      expect(screen.getByDisplayValue("DevLib")).not.toBeNull(),
    );

    fireEvent.change(screen.getByLabelText(/nome/i), {
      target: { value: "DevLib v2" },
    });
    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/");
    });
    expect(vi.mocked(updateProject).mock.calls[0]).toEqual([
      "project-1",
      { name: "DevLib v2", description: "Catálogo pessoal" },
      "access-token",
    ]);
  });

  it("mostra a mensagem de erro da API quando a atualização falha", async () => {
    vi.mocked(getProject).mockResolvedValue(project);
    vi.mocked(updateProject).mockRejectedValue(
      new UpdateProjectError('Já existe um projeto com o nome "Outro"'),
    );
    renderEditProjectPage();
    await waitFor(() =>
      expect(screen.getByDisplayValue("DevLib")).not.toBeNull(),
    );

    fireEvent.change(screen.getByLabelText(/nome/i), {
      target: { value: "Outro" },
    });
    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Já existe um projeto com o nome "Outro"'),
      ).not.toBeNull();
    });
  });
});
