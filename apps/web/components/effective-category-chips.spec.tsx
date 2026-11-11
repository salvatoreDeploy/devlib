import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EffectiveCategoryChips } from "./effective-category-chips";
import type { EffectiveCategory } from "../lib/api/libraries";

function category(
  id: string | null,
  name: string | null,
  projects: string[],
): EffectiveCategory {
  return {
    id,
    name,
    projects: projects.map((projectName) => ({
      id: `p-${projectName}`,
      name: projectName,
    })),
  };
}

function chipTexts() {
  return screen.getAllByTestId("category-chip").map((chip) => chip.textContent);
}

describe("EffectiveCategoryChips", () => {
  it("lib não usada mostra só a categoria global", () => {
    render(
      <EffectiveCategoryChips
        effectiveCategories={[]}
        globalCategoryName="ORM"
      />,
    );

    expect(chipTexts()).toEqual(["ORM"]);
  });

  it("lib não usada sem categoria global mostra 'Sem categoria'", () => {
    render(
      <EffectiveCategoryChips
        effectiveCategories={[]}
        globalCategoryName={null}
      />,
    );

    expect(chipTexts()).toEqual(["Sem categoria"]);
  });

  it("lib usada mostra um chip por categoria efetiva (id null vira 'Sem categoria')", () => {
    render(
      <EffectiveCategoryChips
        effectiveCategories={[
          category("c-front", "Frontend", ["Alfa"]),
          category(null, null, ["Beta"]),
        ]}
        globalCategoryName="ORM"
      />,
    );

    expect(chipTexts()).toEqual(["Frontend", "Sem categoria"]);
  });

  it("mais de 2 categorias: mostra 2 e um '+N'", () => {
    render(
      <EffectiveCategoryChips
        effectiveCategories={[
          category("c-a", "Datas", ["Alfa"]),
          category("c-b", "Frontend", ["Beta"]),
          category("c-c", "UI", ["Gama"]),
          category("c-d", "Utils", ["Delta"]),
        ]}
        globalCategoryName={null}
      />,
    );

    expect(chipTexts()).toEqual(["Datas", "Frontend", "+2"]);
  });

  it("tooltip do chip lista os projetos: 'Categoria — projeto A, projeto B'", async () => {
    const user = userEvent.setup();
    render(
      <EffectiveCategoryChips
        effectiveCategories={[
          category("c-front", "Frontend", ["DevLib App", "API gateway"]),
        ]}
        globalCategoryName={null}
      />,
    );

    await user.hover(screen.getByText("Frontend"));

    expect((await screen.findByRole("tooltip")).textContent).toBe(
      "Frontend — DevLib App, API gateway",
    );
  });

  it("tooltip do '+N' lista as categorias escondidas com seus projetos", async () => {
    const user = userEvent.setup();
    render(
      <EffectiveCategoryChips
        effectiveCategories={[
          category("c-a", "Datas", ["Alfa"]),
          category("c-b", "Frontend", ["Beta"]),
          category("c-c", "UI", ["Gama", "Delta"]),
        ]}
        globalCategoryName={null}
      />,
    );

    await user.hover(screen.getByText("+1"));

    expect((await screen.findByRole("tooltip")).textContent).toBe(
      "UI — Gama, Delta",
    );
  });
});
