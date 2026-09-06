import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProjectTabs } from "./project-tabs";

describe("ProjectTabs", () => {
  it("renderiza as 4 abas", () => {
    render(<ProjectTabs projectId="project-1" />);

    expect(screen.getByText("Bibliotecas")).not.toBeNull();
    expect(screen.getByText("Categorias")).not.toBeNull();
    expect(screen.getByText("Métricas")).not.toBeNull();
    expect(screen.getByText("Developers")).not.toBeNull();
  });

  it("a aba Bibliotecas é um link ativo pra /projects/:id", () => {
    render(<ProjectTabs projectId="project-1" />);

    const link = screen.getByRole("link", { name: /bibliotecas/i });
    expect(link.getAttribute("href")).toBe("/projects/project-1");
    expect(link.getAttribute("aria-current")).toBe("page");
  });

  it("as abas Categorias, Métricas e Developers ficam desabilitadas, sem link", () => {
    render(<ProjectTabs projectId="project-1" />);

    expect(screen.queryByRole("link", { name: /categorias/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /métricas/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /developers/i })).toBeNull();

    const categorias = screen
      .getByText("Categorias")
      .closest("[aria-disabled]");
    expect(categorias?.getAttribute("aria-disabled")).toBe("true");
  });
});
