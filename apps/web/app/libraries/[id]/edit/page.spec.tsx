import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import EditLibraryPage from "./page";
import {
  getLibrary,
  GetLibraryError,
  updateLibrary,
  UpdateLibraryError,
} from "../../../../lib/api/libraries";
import { getCategories } from "../../../../lib/api/categories";
import {
  addTagToLibrary,
  AddTagToLibraryError,
  listLibraryTags,
} from "../../../../lib/api/tags";
import { clearTokens, saveTokens } from "../../../../lib/auth-storage";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useParams: () => ({ id: "library-1" }),
}));

vi.mock("../../../../lib/api/libraries", async () => {
  const actual = await vi.importActual<
    typeof import("../../../../lib/api/libraries")
  >("../../../../lib/api/libraries");
  return { ...actual, getLibrary: vi.fn(), updateLibrary: vi.fn() };
});

vi.mock("../../../../lib/api/categories", async () => {
  const actual = await vi.importActual<
    typeof import("../../../../lib/api/categories")
  >("../../../../lib/api/categories");
  return { ...actual, getCategories: vi.fn() };
});

vi.mock("../../../../lib/api/tags", async () => {
  const actual = await vi.importActual<
    typeof import("../../../../lib/api/tags")
  >("../../../../lib/api/tags");
  return { ...actual, listLibraryTags: vi.fn(), addTagToLibrary: vi.fn() };
});

const category = {
  id: "category-1",
  projectId: null,
  name: "ORM",
  createdAt: "2026-09-03T00:00:00.000Z",
};

const otherCategory = {
  id: "category-2",
  projectId: null,
  name: "Testing",
  createdAt: "2026-09-03T00:00:00.000Z",
};

const library = {
  id: "library-1",
  name: "drizzle-orm",
  categoryId: "category-1",
  notes: "ORM leve",
  createdAt: "2026-09-03T00:00:00.000Z",
  updatedAt: "2026-09-03T00:00:00.000Z",
};

function renderEditLibraryPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <EditLibraryPage />
    </QueryClientProvider>,
  );
}

describe("EditLibraryPage", () => {
  beforeEach(() => {
    pushMock.mockClear();
    vi.mocked(getLibrary).mockReset();
    vi.mocked(updateLibrary).mockReset();
    vi.mocked(getCategories).mockReset();
    vi.mocked(getCategories).mockResolvedValue([category, otherCategory]);
    vi.mocked(listLibraryTags).mockReset();
    vi.mocked(listLibraryTags).mockResolvedValue([]);
    vi.mocked(addTagToLibrary).mockReset();
    clearTokens();
    saveTokens({ accessToken: "access-token", refreshToken: "refresh-token" });
  });

  it("redireciona pra /login quando não há access token", async () => {
    clearTokens();
    renderEditLibraryPage();

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/login");
    });
  });

  it("busca a biblioteca e pré-preenche o formulário, incluindo a categoria selecionada", async () => {
    vi.mocked(getLibrary).mockResolvedValue(library);
    renderEditLibraryPage();

    await waitFor(() => {
      expect(screen.getByDisplayValue("drizzle-orm")).not.toBeNull();
    });
    expect(screen.getByDisplayValue("ORM leve")).not.toBeNull();
    expect(
      screen.getByRole("combobox", { name: /categoria/i }).textContent,
    ).toContain("ORM");
    expect(vi.mocked(getLibrary).mock.calls[0]).toEqual([
      "library-1",
      "access-token",
    ]);
  });

  it("mostra mensagem de erro quando a busca da biblioteca falha", async () => {
    vi.mocked(getLibrary).mockRejectedValue(
      new GetLibraryError("Biblioteca não encontrada"),
    );
    renderEditLibraryPage();

    await waitFor(() => {
      expect(screen.getByText("Biblioteca não encontrada")).not.toBeNull();
    });
  });

  it("mostra erro de validação e não chama a API quando o nome fica vazio", async () => {
    vi.mocked(getLibrary).mockResolvedValue(library);
    renderEditLibraryPage();
    await waitFor(() =>
      expect(screen.getByDisplayValue("drizzle-orm")).not.toBeNull(),
    );

    fireEvent.change(screen.getByLabelText(/nome/i), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(screen.getByText(/nome é obrigatório/i)).not.toBeNull();
    });
    expect(updateLibrary).not.toHaveBeenCalled();
  });

  it("chama updateLibrary com os dados atualizados e redireciona pra / quando salvo com sucesso", async () => {
    vi.mocked(getLibrary).mockResolvedValue(library);
    vi.mocked(updateLibrary).mockResolvedValue({
      ...library,
      name: "drizzle-orm-v2",
      categoryId: "category-2",
    });
    const user = userEvent.setup();
    renderEditLibraryPage();
    await waitFor(() =>
      expect(screen.getByDisplayValue("drizzle-orm")).not.toBeNull(),
    );

    fireEvent.change(screen.getByLabelText(/nome/i), {
      target: { value: "drizzle-orm-v2" },
    });

    await user.click(screen.getByRole("combobox", { name: /categoria/i }));
    const option = await screen.findByRole("option", { name: "Testing" });
    await user.click(option);

    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/");
    });
    expect(vi.mocked(updateLibrary).mock.calls[0]).toEqual([
      "library-1",
      {
        name: "drizzle-orm-v2",
        categoryId: "category-2",
        notes: "ORM leve",
      },
      "access-token",
    ]);
  });

  it("mostra a mensagem de erro da API quando a atualização falha", async () => {
    vi.mocked(getLibrary).mockResolvedValue(library);
    vi.mocked(updateLibrary).mockRejectedValue(
      new UpdateLibraryError('Já existe uma biblioteca com o nome "outra"'),
    );
    renderEditLibraryPage();
    await waitFor(() =>
      expect(screen.getByDisplayValue("drizzle-orm")).not.toBeNull(),
    );

    fireEvent.change(screen.getByLabelText(/nome/i), {
      target: { value: "outra" },
    });
    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Já existe uma biblioteca com o nome "outra"'),
      ).not.toBeNull();
    });
  });

  it("busca e mostra as tags existentes da biblioteca", async () => {
    vi.mocked(getLibrary).mockResolvedValue(library);
    vi.mocked(listLibraryTags).mockResolvedValue([
      { id: "tag-1", name: "react", createdAt: "2026-09-05T00:00:00.000Z" },
    ]);
    renderEditLibraryPage();

    await waitFor(() => {
      expect(screen.getByText("react")).not.toBeNull();
    });
    expect(vi.mocked(listLibraryTags).mock.calls[0]).toEqual([
      "library-1",
      "access-token",
    ]);
  });

  it("adiciona uma tag nova via '+ tag' e mostra a pill assim que a API confirma", async () => {
    vi.mocked(getLibrary).mockResolvedValue(library);
    vi.mocked(listLibraryTags).mockResolvedValue([]);
    vi.mocked(addTagToLibrary).mockResolvedValue({
      id: "tag-1",
      name: "typescript",
      createdAt: "2026-09-05T00:00:00.000Z",
    });
    const user = userEvent.setup();
    renderEditLibraryPage();
    await waitFor(() =>
      expect(screen.getByDisplayValue("drizzle-orm")).not.toBeNull(),
    );

    await user.click(screen.getByRole("button", { name: "+ tag" }));
    await user.type(screen.getByLabelText(/nova tag/i), "typescript{Enter}");

    await waitFor(() => {
      expect(addTagToLibrary).toHaveBeenCalledWith(
        "library-1",
        "typescript",
        "access-token",
      );
    });
  });

  it("mostra a mensagem de erro da API quando adicionar uma tag falha", async () => {
    vi.mocked(getLibrary).mockResolvedValue(library);
    vi.mocked(listLibraryTags).mockResolvedValue([]);
    vi.mocked(addTagToLibrary).mockRejectedValue(
      new AddTagToLibraryError(
        'A tag "react" já está associada a essa biblioteca',
      ),
    );
    const user = userEvent.setup();
    renderEditLibraryPage();
    await waitFor(() =>
      expect(screen.getByDisplayValue("drizzle-orm")).not.toBeNull(),
    );

    await user.click(screen.getByRole("button", { name: "+ tag" }));
    await user.type(screen.getByLabelText(/nova tag/i), "react{Enter}");

    await waitFor(() => {
      expect(
        screen.getByText('A tag "react" já está associada a essa biblioteca'),
      ).not.toBeNull();
    });
  });
});
