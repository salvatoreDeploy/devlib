import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreateLibraryDrawer } from "./create-library-drawer";
import { createLibrary, CreateLibraryError } from "../lib/api/libraries";
import { getCategories } from "../lib/api/categories";

vi.mock("../lib/api/libraries", async () => {
  const actual = await vi.importActual<typeof import("../lib/api/libraries")>(
    "../lib/api/libraries",
  );
  return { ...actual, createLibrary: vi.fn() };
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

function renderDrawer(onCreated = vi.fn()) {
  const queryClient = new QueryClient();
  return {
    onCreated,
    ...render(
      <QueryClientProvider client={queryClient}>
        <CreateLibraryDrawer
          open
          onOpenChange={vi.fn()}
          onCreated={onCreated}
        />
      </QueryClientProvider>,
    ),
  };
}

describe("CreateLibraryDrawer", () => {
  beforeEach(() => {
    vi.mocked(createLibrary).mockReset();
    vi.mocked(getCategories).mockReset();
    vi.mocked(getCategories).mockResolvedValue([category]);
  });

  it("renderiza título e campos de nome, categoria e notas quando aberto", async () => {
    renderDrawer();

    expect(screen.getByText("Criar biblioteca")).not.toBeNull();
    await waitFor(() => {
      expect(screen.getByLabelText(/nome da biblioteca/i)).not.toBeNull();
    });
    expect(screen.getByLabelText(/categoria/i)).not.toBeNull();
    expect(screen.getByLabelText(/notas/i)).not.toBeNull();
  });

  it("não renderiza o conteúdo quando fechado", () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <CreateLibraryDrawer
          open={false}
          onOpenChange={vi.fn()}
          onCreated={vi.fn()}
        />
      </QueryClientProvider>,
    );

    expect(screen.queryByText("Criar biblioteca")).toBeNull();
  });

  it("mostra o campo Tags desabilitado com o aviso de que só fica disponível após salvar", () => {
    renderDrawer();

    const tagButton = screen.getByRole("button", { name: /\+ tag/i });
    expect(tagButton.hasAttribute("disabled")).toBe(true);
    expect(
      screen.getByText(/disponível depois de salvar a biblioteca/i),
    ).not.toBeNull();
  });

  it("mostra erro de validação e não chama a API quando o nome está vazio", async () => {
    renderDrawer();

    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(screen.getByText(/nome é obrigatório/i)).not.toBeNull();
    });
    expect(createLibrary).not.toHaveBeenCalled();
  });

  it("chama createLibrary e onCreated com a categoria selecionada", async () => {
    const library = {
      id: "library-1",
      name: "drizzle-orm",
      categoryId: "category-1",
      notes: "ORM leve",
      createdAt: "2026-09-03T00:00:00.000Z",
      updatedAt: "2026-09-03T00:00:00.000Z",
    };
    vi.mocked(createLibrary).mockResolvedValue(library);
    const user = userEvent.setup();
    const { onCreated } = renderDrawer();
    await waitFor(() =>
      expect(screen.getByLabelText(/nome da biblioteca/i)).not.toBeNull(),
    );

    fireEvent.change(screen.getByLabelText(/nome da biblioteca/i), {
      target: { value: "drizzle-orm" },
    });
    fireEvent.change(screen.getByLabelText(/notas/i), {
      target: { value: "ORM leve" },
    });
    await user.click(screen.getByRole("combobox", { name: /categoria/i }));
    await user.click(await screen.findByRole("option", { name: "ORM" }));

    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith(library);
    });
    expect(vi.mocked(createLibrary).mock.calls[0]).toEqual([
      { name: "drizzle-orm", categoryId: "category-1", notes: "ORM leve" },
    ]);
  });

  it("chama createLibrary sem categoryId quando nenhuma categoria é selecionada", async () => {
    vi.mocked(createLibrary).mockResolvedValue({
      id: "library-1",
      name: "drizzle-orm",
      categoryId: null,
      notes: null,
      createdAt: "2026-09-03T00:00:00.000Z",
      updatedAt: "2026-09-03T00:00:00.000Z",
    });
    renderDrawer();
    await waitFor(() =>
      expect(screen.getByLabelText(/nome da biblioteca/i)).not.toBeNull(),
    );

    fireEvent.change(screen.getByLabelText(/nome da biblioteca/i), {
      target: { value: "drizzle-orm" },
    });
    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(vi.mocked(createLibrary).mock.calls[0]).toEqual([
        { name: "drizzle-orm" },
      ]);
    });
  });

  it("mostra a mensagem de erro da API quando a criação falha", async () => {
    vi.mocked(createLibrary).mockRejectedValue(
      new CreateLibraryError(
        'Já existe uma biblioteca com o nome "drizzle-orm"',
      ),
    );
    const { onCreated } = renderDrawer();
    await waitFor(() =>
      expect(screen.getByLabelText(/nome da biblioteca/i)).not.toBeNull(),
    );

    fireEvent.change(screen.getByLabelText(/nome da biblioteca/i), {
      target: { value: "drizzle-orm" },
    });
    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Já existe uma biblioteca com o nome "drizzle-orm"'),
      ).not.toBeNull();
    });
    expect(onCreated).not.toHaveBeenCalled();
  });
});
