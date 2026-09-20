import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProfileButton } from "./profile-button";

describe("ProfileButton", () => {
  it("mostra o nome e o e-mail do usuário", () => {
    render(<ProfileButton name="Ana Ribeiro" email="ana@example.com" />);

    expect(screen.getByText("Ana Ribeiro")).not.toBeNull();
    expect(screen.getByText("ana@example.com")).not.toBeNull();
  });

  it("mostra só o e-mail quando o nome ainda não foi carregado", () => {
    render(<ProfileButton email="ana@example.com" />);

    expect(screen.queryByText("Ana Ribeiro")).toBeNull();
    expect(screen.getByText("ana@example.com")).not.toBeNull();
  });

  it("mostra as iniciais do nome completo no avatar", () => {
    render(<ProfileButton name="Ana Ribeiro" email="ana@example.com" />);

    expect(screen.getByText("AR")).not.toBeNull();
  });

  it("mostra a inicial do e-mail no avatar quando não há nome", () => {
    render(<ProfileButton email="ana@example.com" />);

    expect(screen.getByText("A")).not.toBeNull();
  });
});
