import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EditProjectLibraryDrawer } from "./edit-project-library-drawer";
import {
  updateProjectLibrary,
  UpdateProjectLibraryError,
  type ProjectLibrary,
} from "../lib/api/projects";
import { getProjectCategories } from "../lib/api/categories";

vi.mock("../lib/api/projects", async () => {
  const actual = await vi.importActual<typeof import("../lib/api/projects")>(
    "../lib/api/projects",
  );
  return { ...actual, updateProjectLibrary: vi.fn() };
});

vi.mock("../lib/api/categories", async () => {
  const actual = await vi.importActual<typeof import("../lib/api/categories")>(
    "../lib/api/categories",
  );
  return { ...actual, getProjectCategories: vi.fn() };
});

const library: ProjectLibrary = {
  id: "library-1",
  name: "drizzle-orm",
  categoryId: "category-global",
  notes: null,
  version: "0.31.2",
  projectCategoryId: null,
  createdAt: "2026-09-03T00:00:00.000Z",
  updatedAt: "2026-09-03T00:00:00.000Z",
};

const categories = [
  {
    id: "category-global",
    projectId: null,
    name: "ORM",
    createdAt: "2026-09-03T00:00:00.000Z",
  },
  {
    id: "category-frontend",
    projectId: null,
    name: "Frontend",
    createdAt: "2026-09-03T00:00:00.000Z",
  },
  {
    id: "category-own",
    projectId: "project-1",
    name: "Infra interna",
    createdAt: "2026-09-03T00:00:00.000Z",
  },
];

function renderDrawer(current: ProjectLibrary | null = library) {
  const queryClient = new QueryClient();
  const onOpenChange = vi.fn();
  return {
    onOpenChange,
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <EditProjectLibraryDrawer
          projectId="project-1"
          projectName="DevLib"
          library={current}
          onOpenChange={onOpenChange}
        />
      </QueryClientProvider>,
    ),
  };
}

async function chooseCategory(
  user: ReturnType<typeof userEvent.setup>,
  name: string | RegExp,
) {
  await user.click(
    await screen.findByRole("combobox", { name: /categoria neste projeto/i }),
  );
  await user.click(await screen.findByRole("option", { name }));
}

describe("EditProjectLibraryDrawer", () => {
  beforeEach(() => {
    vi.mocked(updateProjectLibrary).mockReset();
    vi.mocked(getProjectCategories).mockReset();
    vi.mocked(getProjectCategories).mockResolvedValue(categories);
  });

  it("não renderiza o conteúdo quando não há biblioteca selecionada", () => {
    renderDrawer(null);

    expect(screen.queryByText("Editar no projeto")).toBeNull();
  });

  it("mostra a biblioteca e o projeto, com o padrão da biblioteca selecionado e a versão atual", async () => {
    renderDrawer();

    expect(screen.getByText("Editar no projeto")).not.toBeNull();
    expect(screen.getByText(/drizzle-orm em DevLib/)).not.toBeNull();
    const select = await screen.findByRole("combobox", {
      name: /categoria neste projeto/i,
    });
    await waitFor(() => {
      expect(select.textContent).toMatch(/padrão da biblioteca \(ORM\)/i);
    });
    expect(
      (screen.getByRole("textbox", { name: /versão/i }) as HTMLInputElement)
        .value,
    ).toBe("0.31.2");
  });

  it("lista o padrão da biblioteca, as categorias globais e as do projeto", async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(
      await screen.findByRole("combobox", { name: /categoria neste projeto/i }),
    );

    expect(
      (await screen.findAllByRole("option")).map((o) => o.textContent),
    ).toEqual([
      "Padrão da biblioteca (ORM)",
      "ORM",
      "Frontend",
      "Infra interna",
    ]);
  });

  it("desabilita Salvar enquanto nada mudou", async () => {
    renderDrawer();

    const save = await screen.findByRole("button", { name: /salvar/i });

    expect((save as HTMLButtonElement).disabled).toBe(true);
  });

  it("salva só a categoria quando só ela muda e fecha o drawer", async () => {
    const user = userEvent.setup();
    vi.mocked(updateProjectLibrary).mockResolvedValue({
      id: "project-library-1",
      projectId: "project-1",
      libraryId: "library-1",
      version: "0.31.2",
      categoryId: "category-own",
      createdAt: "2026-10-31T00:00:00.000Z",
    });
    const { onOpenChange } = renderDrawer();

    await chooseCategory(user, "Infra interna");
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(updateProjectLibrary).toHaveBeenCalledWith(
        "project-1",
        "library-1",
        { categoryId: "category-own" },
      );
    });
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("voltar ao padrão envia categoryId null", async () => {
    const user = userEvent.setup();
    vi.mocked(updateProjectLibrary).mockResolvedValue({
      id: "project-library-1",
      projectId: "project-1",
      libraryId: "library-1",
      version: "0.31.2",
      categoryId: null,
      createdAt: "2026-10-31T00:00:00.000Z",
    });
    renderDrawer({ ...library, projectCategoryId: "category-own" });

    await chooseCategory(user, /padrão da biblioteca/i);
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(updateProjectLibrary).toHaveBeenCalledWith(
        "project-1",
        "library-1",
        { categoryId: null },
      );
    });
  });

  it("envia a versão sem espaços nas pontas", async () => {
    const user = userEvent.setup();
    vi.mocked(updateProjectLibrary).mockResolvedValue({
      id: "project-library-1",
      projectId: "project-1",
      libraryId: "library-1",
      version: "19.0.0",
      categoryId: null,
      createdAt: "2026-10-31T00:00:00.000Z",
    });
    renderDrawer();

    const versionInput = screen.getByRole("textbox", { name: /versão/i });
    await user.clear(versionInput);
    await user.type(versionInput, "  19.0.0  ");
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(updateProjectLibrary).toHaveBeenCalledWith(
        "project-1",
        "library-1",
        { version: "19.0.0" },
      );
    });
  });

  it("versão apagada é enviada como null (limpa a versão)", async () => {
    const user = userEvent.setup();
    vi.mocked(updateProjectLibrary).mockResolvedValue({
      id: "project-library-1",
      projectId: "project-1",
      libraryId: "library-1",
      version: null,
      categoryId: null,
      createdAt: "2026-10-31T00:00:00.000Z",
    });
    renderDrawer();

    await user.clear(screen.getByRole("textbox", { name: /versão/i }));
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(updateProjectLibrary).toHaveBeenCalledWith(
        "project-1",
        "library-1",
        { version: null },
      );
    });
  });

  it("mostra erro de validação e não chama a API quando a versão passa de 100 caracteres", async () => {
    const user = userEvent.setup();
    renderDrawer();

    const versionInput = screen.getByRole("textbox", { name: /versão/i });
    await user.clear(versionInput);
    await user.type(versionInput, "1".repeat(101));
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    expect(await screen.findByText(/no máximo 100/i)).not.toBeNull();
    expect(updateProjectLibrary).not.toHaveBeenCalled();
  });

  it("mostra inline a mensagem de erro da API e mantém o drawer aberto", async () => {
    const user = userEvent.setup();
    vi.mocked(updateProjectLibrary).mockRejectedValue(
      new UpdateProjectLibraryError("Categoria não encontrada"),
    );
    const { onOpenChange } = renderDrawer();

    await chooseCategory(user, "Frontend");
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    expect(await screen.findByText("Categoria não encontrada")).not.toBeNull();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("invalida as bibliotecas do projeto e os overviews ao salvar", async () => {
    const user = userEvent.setup();
    vi.mocked(updateProjectLibrary).mockResolvedValue({
      id: "project-library-1",
      projectId: "project-1",
      libraryId: "library-1",
      version: "0.31.2",
      categoryId: "category-own",
      createdAt: "2026-10-31T00:00:00.000Z",
    });
    const { queryClient } = renderDrawer();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    await chooseCategory(user, "Infra interna");
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: ["project-libraries", "project-1"],
      });
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["library-projects", "library-1"],
    });
  });
});
