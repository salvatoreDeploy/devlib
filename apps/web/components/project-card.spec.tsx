import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  librariesCount: 3,
  libraryNames: ["drizzle-orm", "fastify", "zod"],
};

describe("ProjectCard", () => {
  it("renderiza o nome como link para a tela de detalhe do projeto", () => {
    render(<ProjectCard project={project} onDelete={vi.fn()} />);

    const link = screen.getByRole("link", { name: "DevLib" });
    expect(link.getAttribute("href")).toBe("/projects/project-1");
  });

  it("renderiza a descrição e a meta com contagem e nomes das bibliotecas", () => {
    render(<ProjectCard project={project} onDelete={vi.fn()} />);

    expect(screen.getByText("Catálogo pessoal")).not.toBeNull();
    expect(
      screen.getByText("3 bibliotecas · drizzle-orm · fastify · zod"),
    ).not.toBeNull();
  });

  it("mostra '1 biblioteca' no singular quando librariesCount é 1", () => {
    render(
      <ProjectCard
        project={{ ...project, librariesCount: 1, libraryNames: ["zod"] }}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("1 biblioteca · zod")).not.toBeNull();
  });

  it("mostra '0 bibliotecas' sem nomes quando o projeto não tem nenhuma associada", () => {
    render(
      <ProjectCard
        project={{ ...project, librariesCount: 0, libraryNames: [] }}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("0 bibliotecas")).not.toBeNull();
  });

  it("mostra no máximo 3 nomes, mesmo quando o projeto tem mais bibliotecas", () => {
    render(
      <ProjectCard
        project={{
          ...project,
          librariesCount: 5,
          libraryNames: [
            "drizzle-orm",
            "fastify",
            "zod",
            "vitest",
            "typescript",
          ],
        }}
        onDelete={vi.fn()}
      />,
    );

    expect(
      screen.getByText("5 bibliotecas · drizzle-orm · fastify · zod"),
    ).not.toBeNull();
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

  describe("footer de atividade", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-09-20T12:00:00.000Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("mostra 'você criou o projeto' quando createdAt e updatedAt são iguais", () => {
      render(
        <ProjectCard
          project={{
            ...project,
            createdAt: "2026-09-17T12:00:00.000Z",
            updatedAt: "2026-09-17T12:00:00.000Z",
          }}
          onDelete={vi.fn()}
        />,
      );

      expect(screen.getByText("você")).not.toBeNull();
      expect(screen.getByText(/criou o projeto/)).not.toBeNull();
      expect(screen.getByText("3 dias atrás")).not.toBeNull();
    });

    it("mostra 'você atualizou o projeto' quando updatedAt é diferente de createdAt", () => {
      render(
        <ProjectCard
          project={{
            ...project,
            createdAt: "2026-08-01T12:00:00.000Z",
            updatedAt: "2026-09-13T12:00:00.000Z",
          }}
          onDelete={vi.fn()}
        />,
      );

      expect(screen.getByText(/atualizou o projeto/)).not.toBeNull();
      expect(screen.getByText("1 semana atrás")).not.toBeNull();
    });
  });
});
