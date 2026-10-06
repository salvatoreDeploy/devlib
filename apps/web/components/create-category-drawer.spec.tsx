import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreateCategoryDrawer } from "./create-category-drawer";
import {
  createProjectCategory,
  CreateProjectCategoryError,
} from "../lib/api/categories";

vi.mock("../lib/api/categories", async () => {
  const actual = await vi.importActual<typeof import("../lib/api/categories")>(
    "../lib/api/categories",
  );
  return { ...actual, createProjectCategory: vi.fn() };
});

function renderDrawer(onCreated = vi.fn()) {
  const queryClient = new QueryClient();
  return {
    onCreated,
    ...render(
      <QueryClientProvider client={queryClient}>
        <CreateCategoryDrawer
          projectId="project-1"
          open
          onOpenChange={vi.fn()}
          onCreated={onCreated}
        />
      </QueryClientProvider>,
    ),
  };
}

describe("CreateCategoryDrawer", () => {
  beforeEach(() => {
    vi.mocked(createProjectCategory).mockReset();
  });

  it("renderiza título e campo de nome quando aberto", () => {
    renderDrawer();

    expect(screen.getByText("Criar categoria")).not.toBeNull();
    expect(screen.getByLabelText(/nome/i)).not.toBeNull();
  });

  it("não renderiza o conteúdo quando fechado", () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <CreateCategoryDrawer
          projectId="project-1"
          open={false}
          onOpenChange={vi.fn()}
          onCreated={vi.fn()}
        />
      </QueryClientProvider>,
    );

    expect(screen.queryByText("Criar categoria")).toBeNull();
  });

  it("mostra erro de validação e não chama a API quando o nome está vazio", async () => {
    renderDrawer();

    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(screen.getByText(/nome é obrigatório/i)).not.toBeNull();
    });
    expect(createProjectCategory).not.toHaveBeenCalled();
  });

  it("chama createProjectCategory e onCreated com a categoria criada quando salvo com sucesso", async () => {
    const category = {
      id: "category-2",
      projectId: "project-1",
      name: "Infra interna",
      createdAt: "2026-09-03T00:00:00.000Z",
    };
    vi.mocked(createProjectCategory).mockResolvedValue(category);
    const { onCreated } = renderDrawer();

    fireEvent.change(screen.getByLabelText(/nome/i), {
      target: { value: "Infra interna" },
    });
    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith(category);
    });
    expect(vi.mocked(createProjectCategory).mock.calls[0]).toEqual([
      "project-1",
      { name: "Infra interna" },
    ]);
  });

  it("mostra a mensagem de erro da API quando a criação falha", async () => {
    vi.mocked(createProjectCategory).mockRejectedValue(
      new CreateProjectCategoryError(
        'Já existe uma categoria com o nome "Infra interna" nesse escopo',
      ),
    );
    const { onCreated } = renderDrawer();

    fireEvent.change(screen.getByLabelText(/nome/i), {
      target: { value: "Infra interna" },
    });
    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(
        screen.getByText(
          'Já existe uma categoria com o nome "Infra interna" nesse escopo',
        ),
      ).not.toBeNull();
    });
    expect(onCreated).not.toHaveBeenCalled();
  });
});
