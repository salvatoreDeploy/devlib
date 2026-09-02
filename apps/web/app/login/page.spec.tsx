import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import LoginPage from "./page";
import { login, LoginError } from "../../lib/api/auth";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
} from "../../lib/auth-storage";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("../../lib/api/auth", async () => {
  const actual =
    await vi.importActual<typeof import("../../lib/api/auth")>(
      "../../lib/api/auth",
    );
  return { ...actual, login: vi.fn() };
});

function renderLoginPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <LoginPage />
    </QueryClientProvider>,
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    pushMock.mockClear();
    vi.mocked(login).mockReset();
    clearTokens();
  });

  it("renderiza os campos de email e senha", () => {
    renderLoginPage();

    expect(screen.getByLabelText(/email/i)).not.toBeNull();
    expect(screen.getByLabelText(/senha/i)).not.toBeNull();
  });

  it("renderiza título e links de esqueci minha senha / criar conta", () => {
    renderLoginPage();

    expect(screen.getByText("Seu catálogo de bibliotecas")).not.toBeNull();

    const forgotPasswordLink = screen.getByRole("link", {
      name: /esqueci minha senha/i,
    });
    expect(forgotPasswordLink.getAttribute("href")).toBe("/forgot-password");

    const registerLink = screen.getByRole("link", { name: /criar conta/i });
    expect(registerLink.getAttribute("href")).toBe("/register");
  });

  it("mostra erro de validação e não chama a API quando o email é inválido", async () => {
    renderLoginPage();

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "nao-e-email" },
    });
    fireEvent.change(screen.getByLabelText(/senha/i), {
      target: { value: "senha1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByText(/email inválido/i)).not.toBeNull();
    });
    expect(login).not.toHaveBeenCalled();
  });

  it("chama login, salva os tokens e redireciona para / quando as credenciais são válidas", async () => {
    vi.mocked(login).mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });
    renderLoginPage();

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "ana@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/senha/i), {
      target: { value: "senha1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/");
    });
    expect(vi.mocked(login).mock.calls[0][0]).toEqual({
      email: "ana@example.com",
      password: "senha1234",
    });
    expect(getAccessToken()).toBe("access-token");
    expect(getRefreshToken()).toBe("refresh-token");
  });

  it("mostra a mensagem de erro da API quando o login falha", async () => {
    vi.mocked(login).mockRejectedValue(new LoginError("Credenciais inválidas"));
    renderLoginPage();

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "ana@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/senha/i), {
      target: { value: "senha-errada" },
    });
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByText("Credenciais inválidas")).not.toBeNull();
    });
  });
});
