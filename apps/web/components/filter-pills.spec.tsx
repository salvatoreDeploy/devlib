import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tag } from "lucide-react";
import { ClearFiltersButton, FilterPill, SearchPill } from "./filter-pills";

const options = [
  { value: "a", label: "Alfa" },
  { value: "b", label: "Beta" },
];

describe("SearchPill", () => {
  it("é um searchbox com o rótulo acessível e repassa o texto", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SearchPill
        label="Buscar bibliotecas"
        placeholder="buscar bibliotecas"
        value=""
        onChange={onChange}
      />,
    );

    const input = screen.getByRole("searchbox", { name: "Buscar bibliotecas" });
    expect(input.getAttribute("placeholder")).toBe("buscar bibliotecas");
    await user.type(input, "x");
    expect(onChange).toHaveBeenCalledWith("x");
  });
});

describe("FilterPill", () => {
  it("sem valor mostra só o rótulo; lista 'todas' + opções", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <FilterPill
        label="Categoria"
        icon={Tag}
        allLabel="Todas as categorias"
        options={options}
        value={null}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^categoria$/i }));
    const items = await screen.findAllByRole("menuitemradio");
    expect(items.map((item) => item.textContent)).toEqual([
      "Todas as categorias",
      "Alfa",
      "Beta",
    ]);

    await user.click(screen.getByRole("menuitemradio", { name: "Beta" }));
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("com valor mostra 'Rótulo: opção' por padrão, e 'todas' devolve null", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <FilterPill
        label="Categoria"
        allLabel="Todas as categorias"
        options={options}
        value="a"
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Categoria: Alfa" }));
    await user.click(
      await screen.findByRole("menuitemradio", {
        name: "Todas as categorias",
      }),
    );
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("formatActive troca o texto do botão quando há valor", () => {
    render(
      <FilterPill
        label="Versão"
        allLabel="Todas as versões"
        options={options}
        value="b"
        formatActive={(option) => option.label}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Beta" })).not.toBeNull();
  });

  it("fica desabilitada quando pedido", () => {
    render(
      <FilterPill
        label="Tag"
        allLabel="Todas as tags"
        options={[]}
        value={null}
        disabled
        onChange={vi.fn()}
      />,
    );

    expect(
      (screen.getByRole("button", { name: "Tag" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});

describe("ClearFiltersButton", () => {
  it("chama onClick", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ClearFiltersButton onClick={onClick} />);

    await user.click(screen.getByRole("button", { name: /limpar filtros/i }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
