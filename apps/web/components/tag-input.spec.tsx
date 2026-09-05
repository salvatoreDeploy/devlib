import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TagInput } from "./tag-input";

const tags = [
  { id: "tag-1", name: "react" },
  { id: "tag-2", name: "orm" },
];

describe("TagInput", () => {
  it("renderiza as tags existentes como pills", () => {
    render(<TagInput tags={tags} onAddTag={vi.fn()} />);

    expect(screen.getByText("react")).not.toBeNull();
    expect(screen.getByText("orm")).not.toBeNull();
  });

  it("mostra a pill tracejada '+ tag' quando não está editando", () => {
    render(<TagInput tags={[]} onAddTag={vi.fn()} />);

    expect(screen.getByRole("button", { name: "+ tag" })).not.toBeNull();
  });

  it("revela o input ao clicar em '+ tag' e chama onAddTag ao pressionar Enter", async () => {
    const onAddTag = vi.fn();
    const user = userEvent.setup();
    render(<TagInput tags={tags} onAddTag={onAddTag} />);

    await user.click(screen.getByRole("button", { name: "+ tag" }));
    const input = screen.getByLabelText(/nova tag/i);
    await user.type(input, "typescript{Enter}");

    expect(onAddTag).toHaveBeenCalledWith("typescript");
  });

  it("não chama onAddTag quando o input fica vazio", async () => {
    const onAddTag = vi.fn();
    const user = userEvent.setup();
    render(<TagInput tags={tags} onAddTag={onAddTag} />);

    await user.click(screen.getByRole("button", { name: "+ tag" }));
    const input = screen.getByLabelText(/nova tag/i);
    await user.type(input, "{Enter}");

    expect(onAddTag).not.toHaveBeenCalled();
  });

  it("cancela sem chamar onAddTag ao pressionar Escape", async () => {
    const onAddTag = vi.fn();
    const user = userEvent.setup();
    render(<TagInput tags={tags} onAddTag={onAddTag} />);

    await user.click(screen.getByRole("button", { name: "+ tag" }));
    const input = screen.getByLabelText(/nova tag/i);
    await user.type(input, "typescript{Escape}");

    expect(onAddTag).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "+ tag" })).not.toBeNull();
  });

  it("desabilita o input quando isAdding é true", async () => {
    const user = userEvent.setup();
    render(<TagInput tags={tags} onAddTag={vi.fn()} isAdding />);

    await user.click(screen.getByRole("button", { name: "+ tag" }));

    expect(
      (screen.getByLabelText(/nova tag/i) as HTMLInputElement).disabled,
    ).toBe(true);
  });

  it("exibe a mensagem de erro quando informada", () => {
    render(
      <TagInput
        tags={tags}
        onAddTag={vi.fn()}
        error='A tag "react" já está associada a essa biblioteca'
      />,
    );

    expect(
      screen.getByText('A tag "react" já está associada a essa biblioteca'),
    ).not.toBeNull();
  });
});
