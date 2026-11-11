import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ListPagination } from "./list-pagination";

function renderPagination(
  props: Partial<React.ComponentProps<typeof ListPagination>> = {},
) {
  const onPageChange = vi.fn();
  render(
    <ListPagination
      page={2}
      pageCount={3}
      start={11}
      end={20}
      total={27}
      itemLabel="bibliotecas"
      onPageChange={onPageChange}
      {...props}
    />,
  );
  return { onPageChange };
}

function button(name: RegExp) {
  return screen.getByRole("button", { name }) as HTMLButtonElement;
}

describe("ListPagination", () => {
  it("mostra o intervalo, o total e a página atual", () => {
    renderPagination();

    expect(
      screen.getByText("Mostrando 11–20 de 27 bibliotecas"),
    ).not.toBeNull();
    expect(screen.getByText("Página 2 de 3")).not.toBeNull();
  });

  it("navega para primeira, anterior, próxima e última página", async () => {
    const user = userEvent.setup();
    const { onPageChange } = renderPagination();

    await user.click(button(/primeira página/i));
    await user.click(button(/página anterior/i));
    await user.click(button(/próxima página/i));
    await user.click(button(/última página/i));

    expect(onPageChange.mock.calls).toEqual([[1], [1], [3], [3]]);
  });

  it("na primeira página desabilita « e ‹", () => {
    renderPagination({ page: 1, start: 1, end: 10 });

    expect(button(/primeira página/i).disabled).toBe(true);
    expect(button(/página anterior/i).disabled).toBe(true);
    expect(button(/próxima página/i).disabled).toBe(false);
  });

  it("na última página desabilita › e »", () => {
    renderPagination({ page: 3, start: 21, end: 27 });

    expect(button(/próxima página/i).disabled).toBe(true);
    expect(button(/última página/i).disabled).toBe(true);
    expect(button(/página anterior/i).disabled).toBe(false);
  });

  it("com uma página só, todos os botões ficam desabilitados", () => {
    renderPagination({ page: 1, pageCount: 1, start: 1, end: 4, total: 4 });

    expect(screen.getByText("Mostrando 1–4 de 4 bibliotecas")).not.toBeNull();
    for (const name of [
      /primeira página/i,
      /página anterior/i,
      /próxima página/i,
      /última página/i,
    ]) {
      expect(button(name).disabled).toBe(true);
    }
  });

  it("usa o singular quando há um item só", () => {
    renderPagination({
      page: 1,
      pageCount: 1,
      start: 1,
      end: 1,
      total: 1,
      itemLabel: "bibliotecas",
      itemLabelSingular: "biblioteca",
    });

    expect(screen.getByText("Mostrando 1–1 de 1 biblioteca")).not.toBeNull();
  });
});
