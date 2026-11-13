import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EditProjectDrawer } from "./edit-project-drawer";
import { updateProject, UpdateProjectError } from "../lib/api/projects";

vi.mock("../lib/api/projects", async () => {
  const actual = await vi.importActual<typeof import("../lib/api/projects")>(
    "../lib/api/projects",
  );
  return { ...actual, updateProject: vi.fn() };
});

const project = {
  id: "project-1",
  userId: "user-1",
  name: "DevLib",
  description: "Catálogo pessoal",
  createdAt: "2026-09-02T00:00:00.000Z",
  updatedAt: "2026-09-02T00:00:00.000Z",
};

function renderDrawer(current: typeof project | null = project) {
  const queryClient = new QueryClient();
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
  const onOpenChange = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <EditProjectDrawer project={current} onOpenChange={onOpenChange} />
    </QueryClientProvider>,
  );
  return { onOpenChange, invalidateSpy };
}

function nameInput() {
  return screen.getByLabelText(/nome do projeto/i) as HTMLInputElement;
}

function descriptionInput() {
  return screen.getByLabelText(/descrição/i) as HTMLTextAreaElement;
}

describe("EditProjectDrawer", () => {
  beforeEach(() => {
    vi.mocked(updateProject).mockReset();
  });

  it("não renderiza o conteúdo sem projeto", () => {
    renderDrawer(null);

    expect(screen.queryByText("Editar projeto")).toBeNull();
  });

  it("mostra o título e vem pré-preenchido com nome e descrição", () => {
    renderDrawer();

    expect(
      screen.getByRole("heading", { name: "Editar projeto" }),
    ).not.toBeNull();
    expect(nameInput().value).toBe("DevLib");
    expect(descriptionInput().value).toBe("Catálogo pessoal");
    expect(
      screen.getByText(/ainda não dá pra apagar a descrição/i),
    ).not.toBeNull();
  });

  it("nome vazio mostra erro de validação e não chama a API", async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.clear(nameInput());
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    expect(await screen.findByText("Nome é obrigatório")).not.toBeNull();
    expect(updateProject).not.toHaveBeenCalled();
  });

  it("Salvar envia as mudanças, fecha o drawer e invalida as telas que mostram o projeto", async () => {
    vi.mocked(updateProject).mockResolvedValue({
      ...project,
      name: "DevLib App",
    });
    const user = userEvent.setup();
    const { onOpenChange, invalidateSpy } = renderDrawer();

    await user.clear(nameInput());
    await user.type(nameInput(), "DevLib App");
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(updateProject).toHaveBeenCalledWith("project-1", {
        name: "DevLib App",
        description: "Catálogo pessoal",
      });
    });
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
    for (const queryKey of [
      ["projects-overview"],
      ["project", "project-1"],
      ["projects"],
      ["library-projects"],
    ]) {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey });
    }
  });

  it("descrição apagada não é enviada (a API ainda não aceita limpar) — sem erro 400", async () => {
    vi.mocked(updateProject).mockResolvedValue(project);
    const user = userEvent.setup();
    renderDrawer();

    await user.clear(descriptionInput());
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(updateProject).toHaveBeenCalledWith("project-1", {
        name: "DevLib",
      });
    });
  });

  it("mostra a mensagem da API quando a atualização falha (ex: nome repetido) e não fecha", async () => {
    vi.mocked(updateProject).mockRejectedValue(
      new UpdateProjectError('Você já tem um projeto chamado "Outro"'),
    );
    const user = userEvent.setup();
    const { onOpenChange } = renderDrawer();

    await user.clear(nameInput());
    await user.type(nameInput(), "Outro");
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    expect(
      await screen.findByText('Você já tem um projeto chamado "Outro"'),
    ).not.toBeNull();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("Cancelar fecha sem chamar a API", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDrawer();

    await user.type(nameInput(), "-x");
    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(updateProject).not.toHaveBeenCalled();
  });
});
