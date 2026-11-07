import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  LIBRARY_DEFAULT,
  ProjectCategorySelect,
  toAssociationCategoryId,
} from "./project-category-select";

const categories = [
  {
    id: "category-1",
    projectId: null,
    name: "ORM",
    createdAt: "2026-09-03T00:00:00.000Z",
  },
  {
    id: "category-own",
    projectId: "project-1",
    name: "Infra interna",
    createdAt: "2026-09-03T00:00:00.000Z",
  },
];

function renderSelect(
  props: Partial<Parameters<typeof ProjectCategorySelect>[0]> = {},
) {
  const onValueChange = vi.fn();
  render(
    <ProjectCategorySelect
      id="project-category"
      aria-label="Categoria neste projeto"
      value={LIBRARY_DEFAULT}
      onValueChange={onValueChange}
      categories={categories}
      libraryCategoryName="ORM"
      {...props}
    />,
  );
  return { onValueChange };
}

describe("ProjectCategorySelect", () => {
  it("mostra o padrão da biblioteca com o nome da categoria global quando nada foi escolhido", () => {
    renderSelect();

    expect(
      screen.getByRole("combobox", { name: "Categoria neste projeto" })
        .textContent,
    ).toMatch(/Padrão da biblioteca \(ORM\)/);
  });

  it("mostra 'sem categoria' no padrão quando a biblioteca não tem categoria global", () => {
    renderSelect({ libraryCategoryName: null });

    expect(
      screen.getByRole("combobox", { name: "Categoria neste projeto" })
        .textContent,
    ).toMatch(/Padrão da biblioteca \(sem categoria\)/);
  });

  it("mostra 'Categoria' no padrão enquanto o nome da categoria global ainda não é conhecido", () => {
    renderSelect({ libraryCategoryName: undefined });

    expect(
      screen.getByRole("combobox", { name: "Categoria neste projeto" })
        .textContent,
    ).toMatch(/Padrão da biblioteca \(Categoria\)/);
  });

  it("lista o padrão, as categorias globais e as do projeto, e avisa a escolhida", async () => {
    const user = userEvent.setup();
    const { onValueChange } = renderSelect();

    await user.click(
      screen.getByRole("combobox", { name: "Categoria neste projeto" }),
    );

    expect(
      screen.getByRole("option", { name: /padrão da biblioteca/i }),
    ).not.toBeNull();
    expect(screen.getByRole("option", { name: "ORM" })).not.toBeNull();
    await user.click(screen.getByRole("option", { name: "Infra interna" }));

    expect(onValueChange).toHaveBeenCalledWith("category-own");
  });

  it("toAssociationCategoryId traduz o padrão para null e mantém o id escolhido", () => {
    expect(toAssociationCategoryId(LIBRARY_DEFAULT)).toBeNull();
    expect(toAssociationCategoryId("category-own")).toBe("category-own");
  });
});
