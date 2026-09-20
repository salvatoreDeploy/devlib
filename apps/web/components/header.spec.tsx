import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Header, type HeaderProps } from "./header";
import { clearTokens, saveTokens } from "../lib/auth-storage";
import { getCurrentUser } from "../lib/api/users";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("../lib/api/users", () => ({ getCurrentUser: vi.fn() }));

function base64Url(value: string): string {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildAccessToken(payload: unknown): string {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64Url(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

function renderHeader(props?: HeaderProps) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <Header {...props} />
    </QueryClientProvider>,
  );
}

describe("Header", () => {
  beforeEach(() => {
    clearTokens();
    vi.mocked(getCurrentUser).mockReturnValue(new Promise(() => {}));
  });

  it("renderiza a marca devlib.dev", () => {
    renderHeader();

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

    renderHeader();

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

    renderHeader();

    expect(screen.getByText("A")).not.toBeNull();
  });

  it("não quebra e não mostra e-mail quando não há sessão válida", () => {
    renderHeader();

    expect(screen.queryByText(/@/)).toBeNull();
  });

  it("a marca devlib.dev linka pra / (hub)", () => {
    renderHeader();

    const brandLink = screen.getByRole("link", { name: /devlib\.dev/i });
    expect(brandLink.getAttribute("href")).toBe("/");
  });

  it("não mostra breadcrumb quando breadcrumbLabel não é informado", () => {
    renderHeader();

    expect(screen.queryByText("/")).toBeNull();
  });

  it("mostra o breadcrumb quando breadcrumbLabel é informado (projeto ou biblioteca)", () => {
    renderHeader({ breadcrumbLabel: "DevLib" });

    expect(screen.getByText("DevLib")).not.toBeNull();
    expect(screen.getByText("/")).not.toBeNull();
  });

  it("mostra o badge BETA ao lado da marca", () => {
    renderHeader();

    expect(screen.getByText("BETA")).not.toBeNull();
  });

  it("mostra um avatar com as iniciais do breadcrumb quando breadcrumbLabel é informado", () => {
    renderHeader({ breadcrumbLabel: "Acme Corp" });

    expect(screen.getByText("AC")).not.toBeNull();
  });

  it("não mostra avatar de breadcrumb quando breadcrumbLabel não é informado", () => {
    renderHeader();

    expect(screen.queryByText("AC")).toBeNull();
  });
});
