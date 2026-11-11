import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectLibrariesToolbar } from "./project-libraries-toolbar";
import {
  DEFAULT_FILTERS,
  NO_CATEGORY,
  type ProjectLibrariesFilters,
} from "../lib/project-libraries-filters";

const options = [
  { value: "cat-front", label: "Frontend" },
  { value: "cat-orm", label: "ORM" },
  { value: NO_CATEGORY, label: "Sem categoria" },
];

// simula a página: guarda os filtros e repassa as mudanças pra toolbar
function Harness({
  initial = DEFAULT_FILTERS,
  onChangeSpy,
  onClearSpy,
}: {
  initial?: ProjectLibrariesFilters;
  onChangeSpy: ReturnType<typeof vi.fn>;
  onClearSpy?: ReturnType<typeof vi.fn>;
}) {
  const [filters, setFilters] = useState(initial);
  return (
    <ProjectLibrariesToolbar
      filters={filters}
      categoryOptions={options}
      onChange={(changes) => {
        onChangeSpy(changes);
        setFilters((current) => ({ ...current, ...changes, page: 1 }));
      }}
      onClear={() => {
        onClearSpy?.();
        setFilters(DEFAULT_FILTERS);
      }}
    />
  );
}

describe("ProjectLibrariesToolbar", () => {
  it("digitar na busca repassa o texto", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChangeSpy={onChange} />);

    const search = screen.getByRole("searchbox", {
      name: /buscar bibliotecas/i,
    });
    await user.type(search, "re");

    expect(onChange).toHaveBeenLastCalledWith({ q: "re" });
    expect((search as HTMLInputElement).value).toBe("re");
  });

  it("filtro de categoria lista 'Todas as categorias' + as opções e mostra a escolhida no botão", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChangeSpy={onChange} />);

    await user.click(screen.getByRole("button", { name: /^categoria$/i }));
    const items = await screen.findAllByRole("menuitemradio");
    expect(items.map((item) => item.textContent)).toEqual([
      "Todas as categorias",
      "Frontend",
      "ORM",
      "Sem categoria",
    ]);

    await user.click(screen.getByRole("menuitemradio", { name: "ORM" }));

    expect(onChange).toHaveBeenLastCalledWith({ category: "cat-orm" });
    expect(
      screen.getByRole("button", { name: /categoria: orm/i }),
    ).not.toBeNull();
  });

  it("'Todas as categorias' remove o filtro", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Harness
        initial={{ ...DEFAULT_FILTERS, category: "cat-front" }}
        onChangeSpy={onChange}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /categoria: frontend/i }),
    );
    await user.click(
      await screen.findByRole("menuitemradio", {
        name: "Todas as categorias",
      }),
    );

    expect(onChange).toHaveBeenLastCalledWith({ category: null });
  });

  it("filtro de versão: todas, com versão, sem versão", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChangeSpy={onChange} />);

    await user.click(screen.getByRole("button", { name: /^versão$/i }));
    await user.click(
      await screen.findByRole("menuitemradio", { name: "Sem versão" }),
    );

    expect(onChange).toHaveBeenLastCalledWith({ version: "without" });
    expect(screen.getByRole("button", { name: /sem versão/i })).not.toBeNull();

    await user.click(screen.getByRole("button", { name: /sem versão/i }));
    await user.click(
      await screen.findByRole("menuitemradio", { name: "Todas as versões" }),
    );
    expect(onChange).toHaveBeenLastCalledWith({ version: null });
  });

  it("'Limpar filtros' só aparece com filtro ativo e limpa tudo", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onClear = vi.fn();
    const { unmount } = render(<Harness onChangeSpy={onChange} />);

    expect(
      screen.queryByRole("button", { name: /limpar filtros/i }),
    ).toBeNull();
    unmount();

    render(
      <Harness
        initial={{ ...DEFAULT_FILTERS, q: "react", version: "with" }}
        onChangeSpy={onChange}
        onClearSpy={onClear}
      />,
    );
    await user.click(screen.getByRole("button", { name: /limpar filtros/i }));

    expect(onClear).toHaveBeenCalledOnce();
    expect(
      (
        screen.getByRole("searchbox", {
          name: /buscar bibliotecas/i,
        }) as HTMLInputElement
      ).value,
    ).toBe("");
  });

  it("sem opções de categoria (projeto vazio), o filtro de categoria fica desabilitado", () => {
    render(
      <ProjectLibrariesToolbar
        filters={DEFAULT_FILTERS}
        categoryOptions={[]}
        onChange={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    expect(
      (
        screen.getByRole("button", {
          name: /^categoria$/i,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
});
