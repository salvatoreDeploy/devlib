import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreateLibraryDrawer } from "./create-library-drawer";
import {
  createLibrary,
  CreateLibraryError,
  getLibrariesOverview,
} from "../lib/api/libraries";
import { getCategories, getProjectCategories } from "../lib/api/categories";
import {
  associateLibraryToProject,
  AssociateLibraryToProjectError,
  getProjectLibraries,
} from "../lib/api/projects";

vi.mock("../lib/api/libraries", async () => {
  const actual = await vi.importActual<typeof import("../lib/api/libraries")>(
    "../lib/api/libraries",
  );
  return { ...actual, createLibrary: vi.fn(), getLibrariesOverview: vi.fn() };
});

vi.mock("../lib/api/categories", async () => {
  const actual = await vi.importActual<typeof import("../lib/api/categories")>(
    "../lib/api/categories",
  );
  return { ...actual, getCategories: vi.fn(), getProjectCategories: vi.fn() };
});

vi.mock("../lib/api/projects", async () => {
  const actual = await vi.importActual<typeof import("../lib/api/projects")>(
    "../lib/api/projects",
  );
  return {
    ...actual,
    associateLibraryToProject: vi.fn(),
    getProjectLibraries: vi.fn(),
  };
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
    vi.mocked(getLibrariesOverview).mockReset();
    vi.mocked(getProjectLibraries).mockReset();
    vi.mocked(associateLibraryToProject).mockReset();
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

  it("sem projeto, não mostra a busca no catálogo nem o campo de versão", () => {
    renderDrawer();

    expect(screen.queryByLabelText(/buscar no catálogo/i)).toBeNull();
    expect(screen.queryByLabelText(/^versão$/i)).toBeNull();
    expect(getLibrariesOverview).not.toHaveBeenCalled();
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

  describe("aberto de dentro de um projeto", () => {
    const project = { id: "project-1", name: "DevLib" };

    function catalogLibrary(
      id: string,
      name: string,
      categoryId = null as string | null,
    ) {
      return {
        id,
        name,
        categoryId,
        notes: null,
        createdAt: "2026-09-03T00:00:00.000Z",
        updatedAt: "2026-09-03T00:00:00.000Z",
        projectsCount: 0,
      };
    }

    const projectCategory = {
      id: "category-own",
      projectId: "project-1",
      name: "Infra interna",
      createdAt: "2026-09-03T00:00:00.000Z",
    };

    const association = {
      id: "association-1",
      projectId: "project-1",
      libraryId: "library-1",
      version: null,
      categoryId: null,
      createdAt: "2026-09-03T00:00:00.000Z",
    };

    function renderProjectDrawer(onCreated = vi.fn()) {
      const queryClient = new QueryClient();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      return {
        onCreated,
        invalidateSpy,
        ...render(
          <QueryClientProvider client={queryClient}>
            <CreateLibraryDrawer
              open
              onOpenChange={vi.fn()}
              onCreated={onCreated}
              project={project}
            />
          </QueryClientProvider>,
        ),
      };
    }

    beforeEach(() => {
      vi.mocked(getLibrariesOverview).mockResolvedValue([
        catalogLibrary("library-1", "drizzle-orm", "category-1"),
        catalogLibrary("library-2", "drizzle-kit"),
        catalogLibrary("library-3", "zod"),
      ]);
      vi.mocked(getProjectLibraries).mockResolvedValue([]);
      vi.mocked(getProjectCategories).mockReset();
      vi.mocked(getProjectCategories).mockResolvedValue([
        category,
        projectCategory,
      ]);
    });

    it("mostra título, descrição com o nome do projeto e botão Criar e associar", () => {
      renderProjectDrawer();

      expect(screen.getByText("Adicionar biblioteca")).not.toBeNull();
      expect(
        screen.getByText(
          /busque no catálogo ou crie uma nova biblioteca para DevLib/i,
        ),
      ).not.toBeNull();
      expect(
        screen.getByRole("button", { name: /criar e associar/i }),
      ).not.toBeNull();
    });

    it("não mostra resultados antes de digitar na busca", async () => {
      renderProjectDrawer();

      await waitFor(() => expect(getLibrariesOverview).toHaveBeenCalled());
      expect(screen.queryByRole("option", { name: /drizzle-orm/ })).toBeNull();
    });

    it("filtra o catálogo pelo termo, sem diferenciar maiúsculas, com o chip da categoria", async () => {
      renderProjectDrawer();

      fireEvent.change(screen.getByLabelText(/buscar no catálogo/i), {
        target: { value: "DRIZZ" },
      });

      const result = await screen.findByRole("option", { name: /drizzle-orm/ });
      expect(result.textContent).toMatch(/ORM/);
      expect(
        screen.getByRole("option", { name: /drizzle-kit/ }),
      ).not.toBeNull();
      expect(screen.queryByRole("option", { name: /zod/ })).toBeNull();
    });

    it("não mostra bibliotecas que já estão no projeto", async () => {
      vi.mocked(getProjectLibraries).mockResolvedValue([
        {
          id: "library-1",
          name: "drizzle-orm",
          categoryId: "category-1",
          notes: null,
          version: null,
          projectCategoryId: null,
          createdAt: "2026-09-03T00:00:00.000Z",
          updatedAt: "2026-09-03T00:00:00.000Z",
        },
      ]);
      renderProjectDrawer();
      await waitFor(() =>
        expect(getProjectLibraries).toHaveBeenCalledWith("project-1"),
      );

      fireEvent.change(screen.getByLabelText(/buscar no catálogo/i), {
        target: { value: "drizz" },
      });

      expect(
        await screen.findByRole("option", { name: /drizzle-kit/ }),
      ).not.toBeNull();
      expect(screen.queryByRole("option", { name: /drizzle-orm/ })).toBeNull();
    });

    it("limita a busca a 8 resultados", async () => {
      vi.mocked(getLibrariesOverview).mockResolvedValue(
        Array.from({ length: 10 }, (_, index) =>
          catalogLibrary(`library-${index}`, `lib-${index}`),
        ),
      );
      renderProjectDrawer();

      fireEvent.change(screen.getByLabelText(/buscar no catálogo/i), {
        target: { value: "lib" },
      });

      await waitFor(() => {
        expect(screen.getAllByRole("option")).toHaveLength(8);
      });
    });

    it("selecionar um resultado e clicar em Associar associa direto com a versão informada", async () => {
      vi.mocked(associateLibraryToProject).mockResolvedValue({
        ...association,
        version: "0.31.2",
      });
      const { onCreated, invalidateSpy } = renderProjectDrawer();

      fireEvent.change(screen.getByLabelText(/buscar no catálogo/i), {
        target: { value: "drizzle-orm" },
      });
      fireEvent.click(
        await screen.findByRole("option", { name: /drizzle-orm/ }),
      );
      fireEvent.change(screen.getByLabelText(/versão no projeto/i), {
        target: { value: "0.31.2" },
      });
      fireEvent.click(screen.getByRole("button", { name: /^associar$/i }));

      await waitFor(() => {
        expect(associateLibraryToProject).toHaveBeenCalledWith("project-1", {
          libraryId: "library-1",
          version: "0.31.2",
        });
      });
      await waitFor(() => {
        expect(onCreated).toHaveBeenCalledWith(
          expect.objectContaining({ id: "library-1", name: "drizzle-orm" }),
        );
      });
      expect(createLibrary).not.toHaveBeenCalled();
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["project-libraries", "project-1"],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["libraries-overview"],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["projects-overview"],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["library-projects", "library-1"],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["project-categories", "project-1"],
      });
    });

    it("a lib selecionada na busca oferece a categoria neste projeto, com o padrão mostrando a global dela", async () => {
      vi.mocked(associateLibraryToProject).mockResolvedValue({
        ...association,
        categoryId: "category-own",
      });
      const user = userEvent.setup();
      renderProjectDrawer();

      fireEvent.change(screen.getByLabelText(/buscar no catálogo/i), {
        target: { value: "drizzle-orm" },
      });
      fireEvent.click(
        await screen.findByRole("option", { name: /drizzle-orm/ }),
      );
      const select = screen.getByRole("combobox", {
        name: "Categoria de drizzle-orm neste projeto",
      });
      await waitFor(() => {
        expect(select.textContent).toMatch(/Padrão da biblioteca \(ORM\)/);
      });

      await user.click(select);
      await user.click(
        await screen.findByRole("option", { name: "Infra interna" }),
      );
      await user.click(screen.getByRole("button", { name: /^associar$/i }));

      await waitFor(() => {
        expect(associateLibraryToProject).toHaveBeenCalledWith("project-1", {
          libraryId: "library-1",
          categoryId: "category-own",
        });
      });
    });

    it("é operável só pelo teclado: ↓ foca o primeiro resultado, Enter seleciona e Enter na versão associa", async () => {
      vi.mocked(associateLibraryToProject).mockResolvedValue(association);
      const user = userEvent.setup();
      renderProjectDrawer();

      await user.type(
        screen.getByLabelText(/buscar no catálogo/i),
        "drizzle-orm",
      );
      const option = await screen.findByRole("option", { name: /drizzle-orm/ });
      await user.keyboard("{ArrowDown}");
      expect(document.activeElement).toBe(option);

      await user.keyboard("{Enter}");
      expect(option.getAttribute("aria-selected")).toBe("true");

      await user.click(screen.getByLabelText(/versão no projeto/i));
      await user.keyboard("1.0.0{Enter}");

      await waitFor(() => {
        expect(associateLibraryToProject).toHaveBeenCalledWith("project-1", {
          libraryId: "library-1",
          version: "1.0.0",
        });
      });
      expect(createLibrary).not.toHaveBeenCalled();
    });

    it("Enter na busca não submete o formulário de criação", async () => {
      const user = userEvent.setup();
      renderProjectDrawer();

      await user.type(
        screen.getByLabelText(/buscar no catálogo/i),
        "drizz{Enter}",
      );

      expect(screen.queryByText(/nome é obrigatório/i)).toBeNull();
      expect(createLibrary).not.toHaveBeenCalled();
    });

    it("liga a busca à lista de resultados e anuncia quando nada é encontrado", async () => {
      renderProjectDrawer();
      const input = screen.getByLabelText(/buscar no catálogo/i);

      fireEvent.change(input, { target: { value: "drizz" } });
      const listbox = await screen.findByRole("listbox", {
        name: /bibliotecas do catálogo/i,
      });
      expect(input.getAttribute("aria-controls")).toBe(listbox.id);
      expect(input.getAttribute("aria-expanded")).toBe("true");

      fireEvent.change(input, { target: { value: "inexistente" } });
      expect((await screen.findByRole("status")).textContent).toMatch(
        /nenhuma biblioteca encontrada/i,
      );
      expect(input.getAttribute("aria-expanded")).toBe("false");
    });

    it("associa sem version quando a versão fica em branco", async () => {
      vi.mocked(associateLibraryToProject).mockResolvedValue(association);
      renderProjectDrawer();

      fireEvent.change(screen.getByLabelText(/buscar no catálogo/i), {
        target: { value: "drizzle-orm" },
      });
      fireEvent.click(
        await screen.findByRole("option", { name: /drizzle-orm/ }),
      );
      fireEvent.click(screen.getByRole("button", { name: /^associar$/i }));

      await waitFor(() => {
        expect(associateLibraryToProject).toHaveBeenCalledWith("project-1", {
          libraryId: "library-1",
        });
      });
    });

    it("mostra o erro da API quando a associação pela busca falha", async () => {
      vi.mocked(associateLibraryToProject).mockRejectedValue(
        new AssociateLibraryToProjectError(
          "Biblioteca já associada a este projeto",
        ),
      );
      const { onCreated } = renderProjectDrawer();

      fireEvent.change(screen.getByLabelText(/buscar no catálogo/i), {
        target: { value: "drizzle-orm" },
      });
      fireEvent.click(
        await screen.findByRole("option", { name: /drizzle-orm/ }),
      );
      fireEvent.click(screen.getByRole("button", { name: /^associar$/i }));

      expect(
        await screen.findByText("Biblioteca já associada a este projeto"),
      ).not.toBeNull();
      expect(onCreated).not.toHaveBeenCalled();
    });

    it("Criar e associar cria a biblioteca e associa ao projeto com a versão", async () => {
      const library = {
        id: "library-new",
        name: "pg-boss",
        categoryId: null,
        notes: null,
        createdAt: "2026-09-03T00:00:00.000Z",
        updatedAt: "2026-09-03T00:00:00.000Z",
      };
      vi.mocked(createLibrary).mockResolvedValue(library);
      vi.mocked(associateLibraryToProject).mockResolvedValue({
        ...association,
        libraryId: "library-new",
        version: "10.1.0",
      });
      const { onCreated } = renderProjectDrawer();

      fireEvent.change(screen.getByLabelText(/nome da biblioteca/i), {
        target: { value: "pg-boss" },
      });
      fireEvent.change(screen.getByLabelText(/^versão$/i), {
        target: { value: "10.1.0" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: /criar e associar/i }),
      );

      await waitFor(() => {
        expect(onCreated).toHaveBeenCalledWith(library);
      });
      expect(vi.mocked(createLibrary).mock.calls[0]).toEqual([
        { name: "pg-boss" },
      ]);
      expect(associateLibraryToProject).toHaveBeenCalledWith("project-1", {
        libraryId: "library-new",
        version: "10.1.0",
      });
    });

    it("no formulário de criação, separa 'Categoria no catálogo' de 'Categoria neste projeto' com dica", async () => {
      renderProjectDrawer();

      expect(
        screen.getByRole("combobox", { name: "Categoria no catálogo" }),
      ).not.toBeNull();
      expect(
        await screen.findByRole("combobox", {
          name: "Categoria neste projeto",
        }),
      ).not.toBeNull();
      expect(
        screen.getByText(
          /vale só para este projeto — não altera a biblioteca no catálogo/i,
        ),
      ).not.toBeNull();
    });

    it("o padrão de 'Categoria neste projeto' acompanha a 'Categoria no catálogo' escolhida", async () => {
      const user = userEvent.setup();
      renderProjectDrawer();
      const projectSelect = await screen.findByRole("combobox", {
        name: "Categoria neste projeto",
      });
      expect(projectSelect.textContent).toMatch(
        /Padrão da biblioteca \(sem categoria\)/,
      );

      await user.click(
        screen.getByRole("combobox", { name: "Categoria no catálogo" }),
      );
      await user.click(await screen.findByRole("option", { name: "ORM" }));

      expect(projectSelect.textContent).toMatch(/Padrão da biblioteca \(ORM\)/);
    });

    it("Criar e associar grava a categoria do projeto só na associação", async () => {
      vi.mocked(createLibrary).mockResolvedValue({
        id: "library-new",
        name: "pg-boss",
        categoryId: null,
        notes: null,
        createdAt: "2026-09-03T00:00:00.000Z",
        updatedAt: "2026-09-03T00:00:00.000Z",
      });
      vi.mocked(associateLibraryToProject).mockResolvedValue({
        ...association,
        libraryId: "library-new",
        categoryId: "category-own",
      });
      const user = userEvent.setup();
      const { onCreated } = renderProjectDrawer();

      fireEvent.change(screen.getByLabelText(/nome da biblioteca/i), {
        target: { value: "pg-boss" },
      });
      await user.click(
        await screen.findByRole("combobox", {
          name: "Categoria neste projeto",
        }),
      );
      await user.click(
        await screen.findByRole("option", { name: "Infra interna" }),
      );
      fireEvent.click(
        screen.getByRole("button", { name: /criar e associar/i }),
      );

      await waitFor(() => expect(onCreated).toHaveBeenCalled());
      expect(vi.mocked(createLibrary).mock.calls[0]).toEqual([
        { name: "pg-boss" },
      ]);
      expect(associateLibraryToProject).toHaveBeenCalledWith("project-1", {
        libraryId: "library-new",
        categoryId: "category-own",
      });
    });

    it("quando a criação dá certo mas a associação falha, avisa que a biblioteca ficou no catálogo", async () => {
      vi.mocked(createLibrary).mockResolvedValue({
        id: "library-new",
        name: "pg-boss",
        categoryId: null,
        notes: null,
        createdAt: "2026-09-03T00:00:00.000Z",
        updatedAt: "2026-09-03T00:00:00.000Z",
      });
      vi.mocked(associateLibraryToProject).mockRejectedValue(
        new AssociateLibraryToProjectError("erro qualquer"),
      );
      const { onCreated, invalidateSpy } = renderProjectDrawer();

      fireEvent.change(screen.getByLabelText(/nome da biblioteca/i), {
        target: { value: "pg-boss" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: /criar e associar/i }),
      );

      expect(
        await screen.findByText(
          /biblioteca criada no catálogo, mas não foi possível associá-la ao projeto/i,
        ),
      ).not.toBeNull();
      expect(onCreated).not.toHaveBeenCalled();
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["libraries-overview"],
      });
    });
  });
});
