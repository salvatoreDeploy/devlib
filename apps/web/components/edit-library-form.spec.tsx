import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EditLibraryForm } from "./edit-library-form";
import { updateLibrary, UpdateLibraryError } from "../lib/api/libraries";
import { getCategories } from "../lib/api/categories";
import {
  addTagToLibrary,
  AddTagToLibraryError,
  listLibraryTags,
} from "../lib/api/tags";

vi.mock("../lib/api/libraries", async () => {
  const actual = await vi.importActual<typeof import("../lib/api/libraries")>(
    "../lib/api/libraries",
  );
  return { ...actual, updateLibrary: vi.fn() };
});

vi.mock("../lib/api/categories", async () => {
  const actual = await vi.importActual<typeof import("../lib/api/categories")>(
    "../lib/api/categories",
  );
  return { ...actual, getCategories: vi.fn() };
});

vi.mock("../lib/api/tags", async () => {
  const actual =
    await vi.importActual<typeof import("../lib/api/tags")>("../lib/api/tags");
  return { ...actual, listLibraryTags: vi.fn(), addTagToLibrary: vi.fn() };
});

const library = {
  id: "library-1",
  name: "drizzle-orm",
  categoryId: "category-1",
  notes: "ORM leve",
  createdAt: "2026-09-03T00:00:00.000Z",
  updatedAt: "2026-09-03T00:00:00.000Z",
};

const categories = [
  {
    id: "category-1",
    projectId: null,
    name: "ORM",
    createdAt: "2026-09-03T00:00:00.000Z",
  },
  {
    id: "category-2",
    projectId: null,
    name: "Validação",
    createdAt: "2026-09-03T00:00:00.000Z",
  },
];

function renderForm() {
  const queryClient = new QueryClient();
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
  const onCancel = vi.fn();
  const onSaved = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <EditLibraryForm
        library={library}
        onCancel={onCancel}
        onSaved={onSaved}
      />
    </QueryClientProvider>,
  );
  return { onCancel, onSaved, invalidateSpy };
}

function nameInput() {
  return screen.getByLabelText(/nome da biblioteca/i) as HTMLInputElement;
}

describe("EditLibraryForm", () => {
  beforeEach(() => {
    vi.mocked(updateLibrary).mockReset();
    vi.mocked(getCategories).mockReset();
    vi.mocked(getCategories).mockResolvedValue(categories);
    vi.mocked(listLibraryTags).mockReset();
    vi.mocked(listLibraryTags).mockResolvedValue([]);
    vi.mocked(addTagToLibrary).mockReset();
  });

  it("mostra o título, deixa claro que edita o catálogo e vem pré-preenchido", async () => {
    renderForm();

    expect(
      screen.getByRole("heading", { name: "Editar biblioteca" }),
    ).not.toBeNull();
    expect(
      screen.getByText(/vale pra todos os projetos que usam a biblioteca/i),
    ).not.toBeNull();
    expect(nameInput().value).toBe("drizzle-orm");
    expect(
      (screen.getByLabelText(/^notas$/i) as HTMLTextAreaElement).value,
    ).toBe("ORM leve");
    const category = screen.getByRole("combobox", {
      name: /categoria no catálogo/i,
    });
    await waitFor(() => {
      expect(category.textContent).toMatch(/ORM/);
    });
  });

  it("avisa que ainda não dá pra remover a categoria nem apagar as notas", () => {
    renderForm();

    expect(
      screen.getByText(
        /ainda não dá pra remover a categoria nem apagar as notas/i,
      ),
    ).not.toBeNull();
  });

  it("nome vazio mostra erro de validação e não chama a API", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.clear(nameInput());
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    expect(await screen.findByText("Nome é obrigatório")).not.toBeNull();
    expect(updateLibrary).not.toHaveBeenCalled();
  });

  it("Salvar envia as mudanças, invalida catálogo/detalhe/projetos e avisa com a biblioteca atualizada", async () => {
    const updated = { ...library, name: "drizzle", categoryId: "category-2" };
    vi.mocked(updateLibrary).mockResolvedValue(updated);
    const user = userEvent.setup();
    const { onSaved, invalidateSpy } = renderForm();

    await user.clear(nameInput());
    await user.type(nameInput(), "drizzle");
    await user.click(
      screen.getByRole("combobox", { name: /categoria no catálogo/i }),
    );
    await user.click(await screen.findByRole("option", { name: "Validação" }));
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(updateLibrary).toHaveBeenCalledWith("library-1", {
        name: "drizzle",
        categoryId: "category-2",
        notes: "ORM leve",
      });
    });
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledWith(updated);
    });
    for (const queryKey of [
      ["library", "library-1"],
      ["libraries-catalog"],
      ["project-libraries"],
      ["library-projects", "library-1"],
    ]) {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey });
    }
  });

  it("notas apagadas não são enviadas (a API ainda não aceita limpar)", async () => {
    vi.mocked(updateLibrary).mockResolvedValue(library);
    const user = userEvent.setup();
    renderForm();

    await user.clear(screen.getByLabelText(/^notas$/i));
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(updateLibrary).toHaveBeenCalledWith("library-1", {
        name: "drizzle-orm",
        categoryId: "category-1",
      });
    });
  });

  it("mostra a mensagem da API quando a atualização falha (ex: nome repetido) e não sai do formulário", async () => {
    vi.mocked(updateLibrary).mockRejectedValue(
      new UpdateLibraryError('Já existe uma biblioteca com o nome "zod"'),
    );
    const user = userEvent.setup();
    const { onSaved } = renderForm();

    await user.clear(nameInput());
    await user.type(nameInput(), "zod");
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    expect(
      await screen.findByText('Já existe uma biblioteca com o nome "zod"'),
    ).not.toBeNull();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("Cancelar descarta e avisa, sem chamar a API", async () => {
    const user = userEvent.setup();
    const { onCancel } = renderForm();

    await user.type(nameInput(), "-x");
    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(updateLibrary).not.toHaveBeenCalled();
  });

  describe("tags", () => {
    it("mostra as tags da biblioteca", async () => {
      vi.mocked(listLibraryTags).mockResolvedValue([
        { id: "tag-1", name: "react", createdAt: "2026-09-05T00:00:00.000Z" },
      ]);
      renderForm();

      expect(await screen.findByText("react")).not.toBeNull();
      expect(listLibraryTags).toHaveBeenCalledWith("library-1");
    });

    it("'+ tag' grava a tag na hora (sem esperar o Salvar) e atualiza a lista", async () => {
      vi.mocked(addTagToLibrary).mockResolvedValue({
        id: "tag-1",
        name: "typescript",
        createdAt: "2026-09-05T00:00:00.000Z",
      });
      const user = userEvent.setup();
      const { invalidateSpy } = renderForm();

      await user.click(screen.getByRole("button", { name: "+ tag" }));
      await user.type(screen.getByLabelText(/nova tag/i), "typescript{Enter}");

      await waitFor(() => {
        expect(addTagToLibrary).toHaveBeenCalledWith("library-1", "typescript");
      });
      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ["library-tags", "library-1"],
        });
      });
      expect(updateLibrary).not.toHaveBeenCalled();
    });

    it("mostra a mensagem da API quando adicionar a tag falha", async () => {
      vi.mocked(addTagToLibrary).mockRejectedValue(
        new AddTagToLibraryError(
          'A tag "react" já está associada a essa biblioteca',
        ),
      );
      const user = userEvent.setup();
      renderForm();

      await user.click(screen.getByRole("button", { name: "+ tag" }));
      await user.type(screen.getByLabelText(/nova tag/i), "react{Enter}");

      expect(
        await screen.findByText(
          'A tag "react" já está associada a essa biblioteca',
        ),
      ).not.toBeNull();
    });
  });
});
