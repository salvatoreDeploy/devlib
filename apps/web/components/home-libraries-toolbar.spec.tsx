import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HomeLibrariesToolbar } from "./home-libraries-toolbar";
import {
  DEFAULT_HOME_FILTERS,
  type HomeLibrariesFilters,
} from "../lib/home-libraries-filters";
import type { CatalogFacets } from "../lib/api/libraries";

const facets: CatalogFacets = {
  categories: [
    { id: "c-front", name: "Frontend", projectId: null, projectName: null },
    { id: "c-orm", name: "ORM", projectId: null, projectName: null },
    { id: "c-estado", name: "Estado", projectId: "p-1", projectName: "Alfa" },
  ],
  hasUncategorized: true,
  tags: [
    { id: "t-auth", name: "auth" },
    { id: "t-ui", name: "ui" },
  ],
};

function renderToolbar(
  filters: HomeLibrariesFilters = DEFAULT_HOME_FILTERS,
  props: Partial<React.ComponentProps<typeof HomeLibrariesToolbar>> = {},
) {
  const onChange = vi.fn();
  const onClear = vi.fn();
  const utils = render(
    <HomeLibrariesToolbar
      filters={filters}
      facets={facets}
      onChange={onChange}
      onClear={onClear}
      {...props}
    />,
  );
  return { onChange, onClear, ...utils };
}

function searchbox() {
  return screen.getByRole("searchbox", {
    name: /buscar no catálogo/i,
  }) as HTMLInputElement;
}

describe("HomeLibrariesToolbar", () => {
  describe("busca com debounce", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("o campo responde na hora, mas só repassa a busca 300ms depois da última tecla", async () => {
      const { onChange } = renderToolbar();

      // fireEvent: síncrono, não depende de timers (que estão falsos aqui)
      fireEvent.change(searchbox(), { target: { value: "re" } });
      act(() => {
        vi.advanceTimersByTime(200);
      });
      fireEvent.change(searchbox(), { target: { value: "rea" } });

      expect(searchbox().value).toBe("rea");
      expect(onChange).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(299);
      });
      expect(onChange).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(onChange).toHaveBeenCalledOnce();
      expect(onChange).toHaveBeenCalledWith({ q: "rea" });
    });

    it("quando a busca muda por fora (ex: Limpar filtros, Voltar), o campo acompanha", () => {
      const { rerender, onChange, onClear } = renderToolbar({
        ...DEFAULT_HOME_FILTERS,
        q: "react",
      });
      expect(searchbox().value).toBe("react");

      rerender(
        <HomeLibrariesToolbar
          filters={DEFAULT_HOME_FILTERS}
          facets={facets}
          onChange={onChange}
          onClear={onClear}
        />,
      );

      expect(searchbox().value).toBe("");
    });
  });

  it("Categoria: globais, depois as de projeto como 'Nome · Projeto', e 'Sem categoria' quando há", async () => {
    const user = userEvent.setup();
    const { onChange } = renderToolbar();

    await user.click(screen.getByRole("button", { name: /^categoria$/i }));
    const items = await screen.findAllByRole("menuitemradio");
    expect(items.map((item) => item.textContent)).toEqual([
      "Todas as categorias",
      "Frontend",
      "ORM",
      "Estado · Alfa",
      "Sem categoria",
    ]);

    await user.click(
      screen.getByRole("menuitemradio", { name: "Estado · Alfa" }),
    );
    expect(onChange).toHaveBeenCalledWith({ category: "c-estado" });
  });

  it("Categoria ativa aparece no botão; sem 'Sem categoria' quando hasUncategorized é false", async () => {
    const user = userEvent.setup();
    renderToolbar(
      { ...DEFAULT_HOME_FILTERS, category: "c-estado" },
      { facets: { ...facets, hasUncategorized: false } },
    );

    await user.click(
      screen.getByRole("button", { name: "Categoria: Estado · Alfa" }),
    );
    const items = await screen.findAllByRole("menuitemradio");
    expect(items.map((item) => item.textContent)).not.toContain(
      "Sem categoria",
    );
  });

  it("Uso: todas, usadas nos meus projetos, não usadas", async () => {
    const user = userEvent.setup();
    const { onChange } = renderToolbar();

    await user.click(screen.getByRole("button", { name: /^uso$/i }));
    const items = await screen.findAllByRole("menuitemradio");
    expect(items.map((item) => item.textContent)).toEqual([
      "Todas",
      "Usadas nos meus projetos",
      "Não usadas",
    ]);

    await user.click(screen.getByRole("menuitemradio", { name: "Não usadas" }));
    expect(onChange).toHaveBeenCalledWith({ usage: "unused" });
  });

  it("Uso ativo mostra o valor no botão", () => {
    renderToolbar({ ...DEFAULT_HOME_FILTERS, usage: "used" });

    expect(
      screen.getByRole("button", { name: "Usadas nos meus projetos" }),
    ).not.toBeNull();
  });

  it("Tag: lista as tags das facetas e mostra a escolhida", async () => {
    const user = userEvent.setup();
    const { onChange } = renderToolbar();

    await user.click(screen.getByRole("button", { name: /^tag$/i }));
    await user.click(await screen.findByRole("menuitemradio", { name: "ui" }));

    expect(onChange).toHaveBeenCalledWith({ tag: "t-ui" });
  });

  it("sem facetas (carregando) ou sem tags, Categoria/Tag ficam desabilitadas", () => {
    renderToolbar(DEFAULT_HOME_FILTERS, { facets: undefined });

    expect(
      (
        screen.getByRole("button", {
          name: /^categoria$/i,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: /^tag$/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("'Limpar filtros' só com filtro ativo", async () => {
    const user = userEvent.setup();
    const { unmount } = renderToolbar();
    expect(
      screen.queryByRole("button", { name: /limpar filtros/i }),
    ).toBeNull();
    unmount();

    const { onClear } = renderToolbar({ ...DEFAULT_HOME_FILTERS, tag: "t-ui" });
    await user.click(screen.getByRole("button", { name: /limpar filtros/i }));

    expect(onClear).toHaveBeenCalledOnce();
  });
});
