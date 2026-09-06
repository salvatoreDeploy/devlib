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
});
