import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import Home from "./page";
import { clearTokens, saveTokens } from "../lib/auth-storage";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe("Home page", () => {
  beforeEach(() => {
    pushMock.mockClear();
    clearTokens();
  });

  it("redireciona pra /login quando não há access token", async () => {
    render(<Home />);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/login");
    });
  });

  it("mostra a marca e uma saudação quando autenticado", async () => {
    saveTokens({ accessToken: "access-token", refreshToken: "refresh-token" });
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("devlib.dev")).not.toBeNull();
    });
  });

  it("mostra o card Projetos linkando pra /projects", async () => {
    saveTokens({ accessToken: "access-token", refreshToken: "refresh-token" });
    render(<Home />);

    const link = await screen.findByRole("link", { name: /projetos/i });
    expect(link.getAttribute("href")).toBe("/projects");
  });

  it("mostra o card Bibliotecas linkando pra /libraries/new", async () => {
    saveTokens({ accessToken: "access-token", refreshToken: "refresh-token" });
    render(<Home />);

    const link = await screen.findByRole("link", { name: /bibliotecas/i });
    expect(link.getAttribute("href")).toBe("/libraries/new");
  });

  it("mostra Métricas e Configurações desabilitados, sem link", async () => {
    saveTokens({ accessToken: "access-token", refreshToken: "refresh-token" });
    render(<Home />);

    await screen.findByText("devlib.dev");

    expect(screen.queryByRole("link", { name: /métricas/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /configurações/i })).toBeNull();

    const metricas = screen.getByText("Métricas").closest("[aria-disabled]");
    expect(metricas?.getAttribute("aria-disabled")).toBe("true");

    const configuracoes = screen
      .getByText("Configurações")
      .closest("[aria-disabled]");
    expect(configuracoes?.getAttribute("aria-disabled")).toBe("true");
  });
});
