import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LibraryDetailDrawer } from "./library-detail-drawer";
import {
  getLibrary,
  GetLibraryError,
  getLibraryProjects,
  GetLibraryProjectsError,
} from "../lib/api/libraries";
import { getCategories } from "../lib/api/categories";
import { listLibraryTags } from "../lib/api/tags";
import {
  associateLibraryToProject,
  AssociateLibraryToProjectError,
  listProjects,
  removeLibraryFromProject,
  RemoveLibraryFromProjectError,
} from "../lib/api/projects";

vi.mock("../lib/api/libraries", async () => {
  const actual = await vi.importActual<typeof import("../lib/api/libraries")>(
    "../lib/api/libraries",
  );
  return { ...actual, getLibrary: vi.fn(), getLibraryProjects: vi.fn() };
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
  return { ...actual, listLibraryTags: vi.fn() };
});

vi.mock("../lib/api/projects", async () => {
  const actual = await vi.importActual<typeof import("../lib/api/projects")>(
    "../lib/api/projects",
  );
  return {
    ...actual,
    listProjects: vi.fn(),
    associateLibraryToProject: vi.fn(),
    removeLibraryFromProject: vi.fn(),
  };
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

function renderDrawer(libraryId: string | null = "library-1") {
  const queryClient = new QueryClient();
  const onOpenChange = vi.fn();
  return {
    onOpenChange,
    ...render(
      <QueryClientProvider client={queryClient}>
        <LibraryDetailDrawer
          libraryId={libraryId}
          onOpenChange={onOpenChange}
        />
      </QueryClientProvider>,
    ),
  };
}

describe("LibraryDetailDrawer", () => {
  beforeEach(() => {
    vi.mocked(getLibrary).mockReset();
    vi.mocked(getLibraryProjects).mockReset();
    vi.mocked(getCategories).mockReset();
    vi.mocked(getCategories).mockResolvedValue([category]);
    vi.mocked(listLibraryTags).mockReset();
    vi.mocked(listLibraryTags).mockResolvedValue([]);
    vi.mocked(listProjects).mockReset();
    vi.mocked(listProjects).mockResolvedValue([]);
    vi.mocked(associateLibraryToProject).mockReset();
    vi.mocked(removeLibraryFromProject).mockReset();
  });

  it("não renderiza o conteúdo quando libraryId é null", () => {
    vi.mocked(getLibrary).mockResolvedValue(library);
    renderDrawer(null);

    expect(screen.queryByText("drizzle-orm")).toBeNull();
    expect(getLibrary).not.toHaveBeenCalled();
  });

  it("mostra o nome, a categoria e as notas da biblioteca quando carregada", async () => {
    vi.mocked(getLibrary).mockResolvedValue(library);
    vi.mocked(getLibraryProjects).mockResolvedValue([]);
    renderDrawer();

    await waitFor(() => {
      expect(screen.getAllByText("drizzle-orm").length).toBeGreaterThan(0);
    });
    expect(screen.getByText("ORM")).not.toBeNull();
    expect(screen.getByText("ORM leve, migrations explícitas")).not.toBeNull();
  });

  it("mostra 'Sem categoria' quando a biblioteca não tem categoryId", async () => {
    vi.mocked(getLibrary).mockResolvedValue({ ...library, categoryId: null });
    vi.mocked(getLibraryProjects).mockResolvedValue([]);
    renderDrawer();

    await waitFor(() => {
      expect(screen.getByText("Sem categoria")).not.toBeNull();
    });
  });

  it("mostra 'Sem notas' quando a biblioteca não tem notas", async () => {
    vi.mocked(getLibrary).mockResolvedValue({ ...library, notes: null });
    vi.mocked(getLibraryProjects).mockResolvedValue([]);
    renderDrawer();

    await waitFor(() => {
      expect(screen.getByText("Sem notas.")).not.toBeNull();
    });
  });

  it("mostra mensagem de erro quando a biblioteca não existe", async () => {
    vi.mocked(getLibrary).mockRejectedValue(
      new GetLibraryError("Biblioteca não encontrada"),
    );
    vi.mocked(getLibraryProjects).mockResolvedValue([]);
    renderDrawer();

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
    renderDrawer();

    await waitFor(() => {
      expect(screen.getByText("orm")).not.toBeNull();
    });
  });

  it("mostra mensagem de estado vazio quando a biblioteca não tem tags", async () => {
    vi.mocked(getLibrary).mockResolvedValue(library);
    vi.mocked(getLibraryProjects).mockResolvedValue([]);
    vi.mocked(listLibraryTags).mockResolvedValue([]);
    renderDrawer();

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
    renderDrawer();

    await waitFor(() => {
      expect(screen.getByText("DevLib")).not.toBeNull();
    });
    expect(screen.getByText("1.2.3")).not.toBeNull();
  });

  it("mostra mensagem de estado vazio quando a biblioteca não está associada a nenhum projeto", async () => {
    vi.mocked(getLibrary).mockResolvedValue(library);
    vi.mocked(getLibraryProjects).mockResolvedValue([]);
    renderDrawer();

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
    renderDrawer();

    await waitFor(() => {
      expect(screen.getByText("Biblioteca não encontrada")).not.toBeNull();
    });
  });

  it("chama onOpenChange(false) ao clicar em Fechar", async () => {
    const user = userEvent.setup();
    vi.mocked(getLibrary).mockResolvedValue(library);
    vi.mocked(getLibraryProjects).mockResolvedValue([]);
    const { onOpenChange } = renderDrawer();

    await screen.findByText("ORM leve, migrations explícitas");
    await user.click(screen.getByRole("button", { name: /fechar/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  describe("seção Associar a um projeto", () => {
    const project = (id: string, name: string) => ({
      id,
      userId: "user-1",
      name,
      description: null,
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    });

    const devlib = project("project-1", "DevLib");
    const gateway = project("project-2", "API Gateway");
    const estudo = project("project-3", "Estudo RN");

    const association = {
      id: "project-library-1",
      projectId: "project-2",
      libraryId: "library-1",
      version: "18.3.1",
      createdAt: "2026-10-31T00:00:00.000Z",
    };

    function setup() {
      vi.mocked(getLibrary).mockResolvedValue(library);
      vi.mocked(getLibraryProjects).mockResolvedValue([
        { ...devlib, version: "1.2.3" },
      ]);
      vi.mocked(listProjects).mockResolvedValue([devlib, gateway, estudo]);
      return userEvent.setup();
    }

    async function selectProject(
      user: ReturnType<typeof userEvent.setup>,
      name: string,
    ) {
      await user.click(
        await screen.findByRole("combobox", { name: /projeto/i }),
      );
      await user.click(await screen.findByRole("option", { name }));
    }

    it("lista no select só os projetos do usuário que ainda não usam a biblioteca", async () => {
      const user = setup();
      renderDrawer();

      await user.click(
        await screen.findByRole("combobox", { name: /projeto/i }),
      );

      expect(
        (await screen.findAllByRole("option")).map((o) => o.textContent),
      ).toEqual(["API Gateway", "Estudo RN"]);
    });

    it("desabilita o botão Associar enquanto nenhum projeto é selecionado", async () => {
      setup();
      renderDrawer();

      const button = await screen.findByRole("button", { name: /associar/i });

      expect((button as HTMLButtonElement).disabled).toBe(true);
    });

    it("associa com a versão sem espaços nas pontas e recarrega a lista 'Usada em'", async () => {
      const user = setup();
      vi.mocked(associateLibraryToProject).mockResolvedValue(association);
      renderDrawer();

      await selectProject(user, "API Gateway");
      await user.type(
        screen.getByRole("textbox", { name: /versão/i }),
        "  18.3.1  ",
      );
      await user.click(screen.getByRole("button", { name: /associar/i }));

      await waitFor(() => {
        expect(associateLibraryToProject).toHaveBeenCalledWith("project-2", {
          libraryId: "library-1",
          version: "18.3.1",
        });
      });
      await waitFor(() => {
        expect(getLibraryProjects).toHaveBeenCalledTimes(2);
      });
      expect(
        (screen.getByRole("textbox", { name: /versão/i }) as HTMLInputElement)
          .value,
      ).toBe("");
    });

    it("associa sem versão omitindo o campo quando ele fica vazio", async () => {
      const user = setup();
      vi.mocked(associateLibraryToProject).mockResolvedValue({
        ...association,
        version: null,
      });
      renderDrawer();

      await selectProject(user, "Estudo RN");
      await user.type(screen.getByRole("textbox", { name: /versão/i }), "   ");
      await user.click(screen.getByRole("button", { name: /associar/i }));

      await waitFor(() => {
        expect(associateLibraryToProject).toHaveBeenCalledWith("project-3", {
          libraryId: "library-1",
        });
      });
    });

    it("mostra erro de validação e não chama a API quando a versão passa de 100 caracteres", async () => {
      const user = setup();
      renderDrawer();

      await selectProject(user, "API Gateway");
      await user.type(
        screen.getByRole("textbox", { name: /versão/i }),
        "1".repeat(101),
      );
      await user.click(screen.getByRole("button", { name: /associar/i }));

      expect(await screen.findByText(/no máximo 100/i)).not.toBeNull();
      expect(associateLibraryToProject).not.toHaveBeenCalled();
    });

    it("mostra inline a mensagem de erro da API", async () => {
      const user = setup();
      vi.mocked(associateLibraryToProject).mockRejectedValue(
        new AssociateLibraryToProjectError(
          "Essa biblioteca já está associada ao projeto",
        ),
      );
      renderDrawer();

      await selectProject(user, "API Gateway");
      await user.click(screen.getByRole("button", { name: /associar/i }));

      expect(
        await screen.findByText("Essa biblioteca já está associada ao projeto"),
      ).not.toBeNull();
    });

    it("mostra estado vazio quando o usuário não tem projetos", async () => {
      vi.mocked(getLibrary).mockResolvedValue(library);
      vi.mocked(getLibraryProjects).mockResolvedValue([]);
      vi.mocked(listProjects).mockResolvedValue([]);
      renderDrawer();

      expect(
        await screen.findByText(/você ainda não tem projetos/i),
      ).not.toBeNull();
      expect(screen.queryByRole("combobox", { name: /projeto/i })).toBeNull();
    });

    it("mostra estado vazio quando a biblioteca já está em todos os projetos do usuário", async () => {
      vi.mocked(getLibrary).mockResolvedValue(library);
      vi.mocked(getLibraryProjects).mockResolvedValue([
        { ...devlib, version: "1.2.3" },
      ]);
      vi.mocked(listProjects).mockResolvedValue([devlib]);
      renderDrawer();

      expect(
        await screen.findByText(/já associada a todos os seus projetos/i),
      ).not.toBeNull();
      expect(screen.queryByRole("combobox", { name: /projeto/i })).toBeNull();
    });
  });

  describe("ação Remover na lista 'Usada em'", () => {
    const usedIn = [
      {
        id: "project-1",
        userId: "user-1",
        name: "DevLib",
        description: null,
        version: "1.2.3",
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      },
      {
        id: "project-2",
        userId: "user-1",
        name: "API Gateway",
        description: null,
        version: null,
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      },
    ];

    function setup() {
      vi.mocked(getLibrary).mockResolvedValue(library);
      vi.mocked(getLibraryProjects).mockResolvedValue(usedIn);
      return userEvent.setup();
    }

    it("mostra um botão Remover por projeto da lista", async () => {
      setup();
      renderDrawer();

      expect(
        await screen.findByRole("button", { name: "Remover de DevLib" }),
      ).not.toBeNull();
      expect(
        screen.getByRole("button", { name: "Remover de API Gateway" }),
      ).not.toBeNull();
    });

    it("pede confirmação e não chama a API ao cancelar", async () => {
      const user = setup();
      renderDrawer();

      await user.click(
        await screen.findByRole("button", { name: "Remover de DevLib" }),
      );
      const dialog = await screen.findByRole("alertdialog");

      expect(dialog.textContent).toMatch(/drizzle-orm/);
      expect(dialog.textContent).toMatch(/DevLib/);
      await user.click(screen.getByRole("button", { name: "Cancelar" }));

      await waitFor(() => {
        expect(screen.queryByRole("alertdialog")).toBeNull();
      });
      expect(removeLibraryFromProject).not.toHaveBeenCalled();
    });

    it("remove a associação ao confirmar e recarrega a lista 'Usada em'", async () => {
      const user = setup();
      vi.mocked(removeLibraryFromProject).mockResolvedValue(undefined);
      renderDrawer();

      await user.click(
        await screen.findByRole("button", { name: "Remover de DevLib" }),
      );
      await screen.findByRole("alertdialog");
      await user.click(screen.getByRole("button", { name: "Remover" }));

      await waitFor(() => {
        expect(removeLibraryFromProject).toHaveBeenCalledWith(
          "project-1",
          "library-1",
        );
      });
      await waitFor(() => {
        expect(getLibraryProjects).toHaveBeenCalledTimes(2);
      });
      await waitFor(() => {
        expect(screen.queryByRole("alertdialog")).toBeNull();
      });
    });

    it("mostra inline a mensagem de erro da API quando a remoção falha", async () => {
      const user = setup();
      vi.mocked(removeLibraryFromProject).mockRejectedValue(
        new RemoveLibraryFromProjectError(
          "Biblioteca não associada a esse projeto",
        ),
      );
      renderDrawer();

      await user.click(
        await screen.findByRole("button", { name: "Remover de DevLib" }),
      );
      await screen.findByRole("alertdialog");
      await user.click(screen.getByRole("button", { name: "Remover" }));

      expect(
        await screen.findByText("Biblioteca não associada a esse projeto"),
      ).not.toBeNull();
    });
  });
});
