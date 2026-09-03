import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import NewLibraryPage from "./page";
import { createLibrary, CreateLibraryError } from "../../../lib/api/libraries";
import { getCategories } from "../../../lib/api/categories";
import { clearTokens, saveTokens } from "../../../lib/auth-storage";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("../../../lib/api/libraries", async () => {
  const actual = await vi.importActual<
    typeof import("../../../lib/api/libraries")
  >("../../../lib/api/libraries");
  return { ...actual, createLibrary: vi.fn() };
});

vi.mock("../../../lib/api/categories", async () => {
  const actual = await vi.importActual<
    typeof import("../../../lib/api/categories")
  >("../../../lib/api/categories");
  return { ...actual, getCategories: vi.fn() };
});

const category = {
  id: "category-1",
  projectId: null,
  name: "ORM",
  createdAt: "2026-09-03T00:00:00.000Z",
};

function renderNewLibraryPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <NewLibraryPage />
    </QueryClientProvider>,
  );
}

describe("NewLibraryPage", () => {
  beforeEach(() => {
    pushMock.mockClear();
    vi.mocked(createLibrary).mockReset();
    vi.mocked(getCategories).mockReset();
    vi.mocked(getCategories).mockResolvedValue([category]);
    clearTokens();
    saveTokens({ accessToken: "access-token", refreshToken: "refresh-token" });
  });

  it("redireciona pra /login quando não há access token", async () => {
    clearTokens();
    renderNewLibraryPage();

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/login");
    });
  });

  it("renderiza os campos de nome, categoria e notas quando autenticado", async () => {
    renderNewLibraryPage();

    await waitFor(() => {
      expect(screen.getByLabelText(/nome/i)).not.toBeNull();
    });
    expect(screen.getByLabelText(/categoria/i)).not.toBeNull();
    expect(screen.getByLabelText(/notas/i)).not.toBeNull();
  });

  it("mostra erro de validação e não chama a API quando o nome está vazio", async () => {
    renderNewLibraryPage();
    await waitFor(() => expect(screen.getByLabelText(/nome/i)).not.toBeNull());

    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(screen.getByText(/nome é obrigatório/i)).not.toBeNull();
    });
    expect(createLibrary).not.toHaveBeenCalled();
  });

  it("chama createLibrary com o access token e redireciona pra / quando criada com sucesso", async () => {
    vi.mocked(createLibrary).mockResolvedValue({
      id: "library-1",
      name: "drizzle-orm",
      categoryId: "category-1",
      notes: "ORM leve",
      createdAt: "2026-09-03T00:00:00.000Z",
      updatedAt: "2026-09-03T00:00:00.000Z",
    });
    const user = userEvent.setup();
    renderNewLibraryPage();
    await waitFor(() => expect(screen.getByLabelText(/nome/i)).not.toBeNull());

    fireEvent.change(screen.getByLabelText(/nome/i), {
      target: { value: "drizzle-orm" },
    });
    fireEvent.change(screen.getByLabelText(/notas/i), {
      target: { value: "ORM leve" },
    });

    await user.click(screen.getByRole("combobox", { name: /categoria/i }));
    const option = await screen.findByRole("option", { name: "ORM" });
    await user.click(option);

    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/");
    });
    expect(vi.mocked(createLibrary).mock.calls[0]).toEqual([
      { name: "drizzle-orm", categoryId: "category-1", notes: "ORM leve" },
      "access-token",
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
    renderNewLibraryPage();
    await waitFor(() => expect(screen.getByLabelText(/nome/i)).not.toBeNull());

    fireEvent.change(screen.getByLabelText(/nome/i), {
      target: { value: "drizzle-orm" },
    });
    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/");
    });
    expect(vi.mocked(createLibrary).mock.calls[0]).toEqual([
      { name: "drizzle-orm" },
      "access-token",
    ]);
  });

  it("mostra a mensagem de erro da API quando a criação falha", async () => {
    vi.mocked(createLibrary).mockRejectedValue(
      new CreateLibraryError(
        'Já existe uma biblioteca com o nome "drizzle-orm"',
      ),
    );
    renderNewLibraryPage();
    await waitFor(() => expect(screen.getByLabelText(/nome/i)).not.toBeNull());

    fireEvent.change(screen.getByLabelText(/nome/i), {
      target: { value: "drizzle-orm" },
    });
    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Já existe uma biblioteca com o nome "drizzle-orm"'),
      ).not.toBeNull();
    });
  });
});
