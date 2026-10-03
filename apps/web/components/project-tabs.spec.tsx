import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { ProjectTabs } from "./project-tabs";

vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));

describe("ProjectTabs", () => {
  it("renderiza as 4 abas", () => {
    vi.mocked(usePathname).mockReturnValue("/projects/project-1");
    render(<ProjectTabs projectId="project-1" />);

    expect(screen.getByText("Bibliotecas")).not.toBeNull();
    expect(screen.getByText("Categorias")).not.toBeNull();
    expect(screen.getByText("Métricas")).not.toBeNull();
    expect(screen.getByText("Developers")).not.toBeNull();
  });

  it("a aba Bibliotecas é um link ativo pra /projects/:id quando essa é a rota atual", () => {
    vi.mocked(usePathname).mockReturnValue("/projects/project-1");
    render(<ProjectTabs projectId="project-1" />);

    const link = screen.getByRole("link", { name: /bibliotecas/i });
    expect(link.getAttribute("href")).toBe("/projects/project-1");
    expect(link.getAttribute("aria-current")).toBe("page");
  });

  it("a aba Categorias é um link ativo pra /projects/:id/categories quando essa é a rota atual", () => {
    vi.mocked(usePathname).mockReturnValue("/projects/project-1/categories");
    render(<ProjectTabs projectId="project-1" />);

    const categorias = screen.getByRole("link", { name: /categorias/i });
    expect(categorias.getAttribute("href")).toBe(
      "/projects/project-1/categories",
    );
    expect(categorias.getAttribute("aria-current")).toBe("page");

    const bibliotecas = screen.getByRole("link", { name: /bibliotecas/i });
    expect(bibliotecas.getAttribute("aria-current")).toBeNull();
  });

  it("as abas Métricas e Developers ficam desabilitadas, sem link", () => {
    vi.mocked(usePathname).mockReturnValue("/projects/project-1");
    render(<ProjectTabs projectId="project-1" />);

    expect(screen.queryByRole("link", { name: /métricas/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /developers/i })).toBeNull();

    const metricas = screen.getByText("Métricas").closest("[aria-disabled]");
    expect(metricas?.getAttribute("aria-disabled")).toBe("true");
  });
});
