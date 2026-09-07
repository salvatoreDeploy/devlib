import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Header } from "./header";
import { clearTokens, saveTokens } from "../lib/auth-storage";

function base64Url(value: string): string {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildAccessToken(payload: unknown): string {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64Url(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

describe("Header", () => {
  beforeEach(() => {
    clearTokens();
  });

  it("renderiza a marca devlib.dev", () => {
    render(<Header />);

    expect(screen.getByText("devlib.dev")).not.toBeNull();
  });

  it("mostra o e-mail do usuário extraído do access token", () => {
    saveTokens({
      accessToken: buildAccessToken({
        sub: "user-1",
        email: "ana@example.com",
      }),
      refreshToken: "refresh-token",
    });

    render(<Header />);

    expect(screen.getByText("ana@example.com")).not.toBeNull();
  });

  it("mostra a inicial do e-mail no avatar", () => {
    saveTokens({
      accessToken: buildAccessToken({
        sub: "user-1",
        email: "ana@example.com",
      }),
      refreshToken: "refresh-token",
    });

    render(<Header />);

    expect(screen.getByText("A")).not.toBeNull();
  });

  it("não quebra e não mostra e-mail quando não há sessão válida", () => {
    render(<Header />);

    expect(screen.queryByText(/@/)).toBeNull();
  });

  it("a marca devlib.dev linka pra / (hub)", () => {
    render(<Header />);

    const brandLink = screen.getByRole("link", { name: /devlib\.dev/i });
    expect(brandLink.getAttribute("href")).toBe("/");
  });

  it("não mostra breadcrumb quando breadcrumbLabel não é informado", () => {
    render(<Header />);

    expect(screen.queryByText("/")).toBeNull();
  });

  it("mostra o breadcrumb quando breadcrumbLabel é informado (projeto ou biblioteca)", () => {
    render(<Header breadcrumbLabel="DevLib" />);

    expect(screen.getByText("DevLib")).not.toBeNull();
    expect(screen.getByText("/")).not.toBeNull();
  });
});
