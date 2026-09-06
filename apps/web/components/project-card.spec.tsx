import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectCard } from "./project-card";

const project = {
  id: "project-1",
  userId: "user-1",
  name: "DevLib",
  description: "Catálogo pessoal",
  createdAt: "2026-09-02T00:00:00.000Z",
  updatedAt: "2026-09-02T00:00:00.000Z",
};

describe("ProjectCard", () => {
  it("renderiza o nome como link para a tela de detalhe do projeto", () => {
    render(<ProjectCard project={project} onDelete={vi.fn()} />);

    const link = screen.getByRole("link", { name: "DevLib" });
    expect(link.getAttribute("href")).toBe("/projects/project-1");
  });

  it("renderiza a descrição e a data de criação", () => {
    render(<ProjectCard project={project} onDelete={vi.fn()} />);

    expect(screen.getByText("Catálogo pessoal")).not.toBeNull();
    expect(screen.getByText(/criado em/i)).not.toBeNull();
  });

  it("abre o menu '···' com links de Editar e opção de Excluir", async () => {
    const user = userEvent.setup();
    render(<ProjectCard project={project} onDelete={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "···" }));

    const editLink = await screen.findByRole("menuitem", { name: /editar/i });
    expect(editLink.getAttribute("href")).toBe("/projects/project-1/edit");
    expect(screen.getByRole("menuitem", { name: /excluir/i })).not.toBeNull();
  });

  it("pede confirmação antes de excluir e só chama onDelete ao confirmar", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(<ProjectCard project={project} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: "···" }));
    await user.click(screen.getByRole("menuitem", { name: /excluir/i }));

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/DevLib/)).not.toBeNull();
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(
      within(dialog).getByRole("button", { name: /^excluir$/i }),
    );

    expect(onDelete).toHaveBeenCalledWith("project-1");
  });

  it("não chama onDelete quando a exclusão é cancelada", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(<ProjectCard project={project} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: "···" }));
    await user.click(screen.getByRole("menuitem", { name: /excluir/i }));

    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: /cancelar/i }));

    expect(onDelete).not.toHaveBeenCalled();
  });

  it("mostra 'excluindo...' e desabilita a confirmação quando isDeleting é true", async () => {
    const user = userEvent.setup();
    render(<ProjectCard project={project} onDelete={vi.fn()} isDeleting />);

    await user.click(screen.getByRole("button", { name: "···" }));
    await user.click(screen.getByRole("menuitem", { name: /excluir/i }));

    const dialog = await screen.findByRole("alertdialog");
    const confirmButton = within(dialog).getByRole("button", {
      name: /excluindo/i,
    });
    expect((confirmButton as HTMLButtonElement).disabled).toBe(true);
  });
});
