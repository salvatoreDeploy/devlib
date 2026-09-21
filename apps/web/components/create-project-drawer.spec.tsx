import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreateProjectDrawer } from "./create-project-drawer";
import { createProject, CreateProjectError } from "../lib/api/projects";

vi.mock("../lib/api/projects", async () => {
  const actual = await vi.importActual<typeof import("../lib/api/projects")>(
    "../lib/api/projects",
  );
  return { ...actual, createProject: vi.fn() };
});

function renderDrawer(onCreated = vi.fn()) {
  const queryClient = new QueryClient();
  return {
    onCreated,
    ...render(
      <QueryClientProvider client={queryClient}>
        <CreateProjectDrawer
          open
          onOpenChange={vi.fn()}
          onCreated={onCreated}
        />
      </QueryClientProvider>,
    ),
  };
}

describe("CreateProjectDrawer", () => {
  beforeEach(() => {
    vi.mocked(createProject).mockReset();
  });

  it("renderiza título e campos de nome e descrição quando aberto", () => {
    renderDrawer();

    expect(screen.getByText("Criar projeto")).not.toBeNull();
    expect(screen.getByLabelText(/nome do projeto/i)).not.toBeNull();
    expect(screen.getByLabelText(/descrição/i)).not.toBeNull();
  });

  it("não renderiza o conteúdo quando fechado", () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <CreateProjectDrawer
          open={false}
          onOpenChange={vi.fn()}
          onCreated={vi.fn()}
        />
      </QueryClientProvider>,
    );

    expect(screen.queryByText("Criar projeto")).toBeNull();
  });

  it("mostra erro de validação e não chama a API quando o nome está vazio", async () => {
    renderDrawer();

    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(screen.getByText(/nome é obrigatório/i)).not.toBeNull();
    });
    expect(createProject).not.toHaveBeenCalled();
  });

  it("chama createProject e onCreated com o projeto criado quando salvo com sucesso", async () => {
    const project = {
      id: "project-1",
      userId: "user-1",
      name: "DevLib",
      description: "Catálogo pessoal",
      createdAt: "2026-09-02T00:00:00.000Z",
      updatedAt: "2026-09-02T00:00:00.000Z",
    };
    vi.mocked(createProject).mockResolvedValue(project);
    const { onCreated } = renderDrawer();

    fireEvent.change(screen.getByLabelText(/nome do projeto/i), {
      target: { value: "DevLib" },
    });
    fireEvent.change(screen.getByLabelText(/descrição/i), {
      target: { value: "Catálogo pessoal" },
    });
    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith(project);
    });
    expect(vi.mocked(createProject).mock.calls[0]).toEqual([
      { name: "DevLib", description: "Catálogo pessoal" },
    ]);
  });

  it("mostra a mensagem de erro da API quando a criação falha", async () => {
    vi.mocked(createProject).mockRejectedValue(
      new CreateProjectError('Já existe um projeto com o nome "DevLib"'),
    );
    const { onCreated } = renderDrawer();

    fireEvent.change(screen.getByLabelText(/nome do projeto/i), {
      target: { value: "DevLib" },
    });
    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Já existe um projeto com o nome "DevLib"'),
      ).not.toBeNull();
    });
    expect(onCreated).not.toHaveBeenCalled();
  });
});
